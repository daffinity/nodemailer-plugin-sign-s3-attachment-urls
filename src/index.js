
import _ from 'lodash';
import promisify from 'es6-promisify';
import AWS from 'aws-sdk';


export default function signS3AttachmentUrls (options = {}) {
  // Validate options.
  if (options.defaultBucket && !_.isString(options.defaultBucket)) throw Error('Option `defaultBucket` must be a String (e.g. `signS3AttachmentUrls({ defaultBucket: "mybucket" })`');

  // Set defaults.
  const opts = _.defaultsDeep(opts, {
    s3: {
      apiVersion: '2006-03-01',
      // Require AWS signature version 4 to enforce signing of metadata parameters.
      SignatureVersion: 'v4'
    }
  });

  // Prepare S3 using config.
  const s3 = new AWS.S3(opts.s3);

  // Return compile with the callback pattern.
  return function _compile (mail, callback) {
    try {
      // The nodemailer plugin pattern expects us to mutate mail instead of returning it.
      compile(mail, s3, opts)
        .then(() => callback(null))
        .catch(callback);
    }
    catch (err) {
      callback(err);
    }
  }.bind(this);
}


export async function compile (mail, s3, options) {
  // Get the attachments.
  //let attachments = await mail.resolveContent(mail.data, 'attachments');
  let attachments = mail.data.attachments;

  // TODO: Support alternatives.

  // Stop if there are no attachments.
  if (!attachments) return mail;

  // Create a transformation array of Promises.
  const promises = attachments.map(async function (attachment) {
    if (!_.isPlainObject(attachment.s3)) return attachment;
    const { s3: attachmentOptions } = attachment;

    const signOptions = {
      Bucket: attachmentOptions.bucket || attachmentOptions.Bucket || options.defaultBucket,
      Key: attachmentOptions.key || attachmentOptions.Key
    };

    // TODO: Assert that there is a bucket and key.

    // we cannot currently use this since it does not return a promise
    // <https://github.com/aws/aws-sdk-js/pull/1079>
    // await s3obj.upload({ Body }).promise();
    //
    // so instead we use es6-promisify to convert it to a promise
    const signedUrl = await promisify(s3.getSignedUrl, s3)('getObject', signOptions);

    // Remove s3 options from the attachment.
    _.unset(attachment, 's3');
    // Add the signed URL to the attachment for download by nodemailer.
    attachment.url = signedUrl;

    return attachment;
  });

  // Await Promises and replace attachments.
  mail.data.attachments = await Promise.all(promises);

  // Return mail for easy testing.
  return mail;
}

