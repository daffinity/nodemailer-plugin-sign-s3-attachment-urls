
import {
  expect,
  default as chai
} from 'chai';
import chaiAsPromised from 'chai-as-promised';

import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {
  default as signS3AttachmentUrls,
  compile
} from '../src/index.js';


chai.use(chaiAsPromised);
chai.use(sinonChai);


describe('#signS3AttachmentUrls', () => {
  let sandbox;
  beforeEach('setup sinon sandbox', function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach('teardown sinon sandbox', () => sandbox.restore());


  it('should be defined', () => {
    expect(signS3AttachmentUrls).to.be.a('function');
  });

  describe('with argument `options`', () => {
    it('should require defaultBucket to be a String', () => {
      expect(() => signS3AttachmentUrls({ defaultBucket: ['bad'] })).to.throw(Error, /defaultBucket/i);
    });

    it('should not require defaultBucket to be defined', () => {
      expect(() => signS3AttachmentUrls({ })).to.not.throw(Error, /defaultBucket/i);
    });

    describe('with defaultBucket set', () => {
      it('should not throw any errors', () => {
        expect(() => signS3AttachmentUrls({ defaultBucket: 'default_bucket' })).to.not.throw();
      });

      // TODO: Use rewire with sinon to make this a proper unit test.
      it('should pass defaultBucket to compile', done => {
        const _compile = signS3AttachmentUrls({ defaultBucket: 'default_bucket' });
        let mail = {
          data: {
            attachments: [{ s3: { Key: 'test' } }]
          }
        };
        _compile(mail, err => {
          try {
            expect(err).to.not.exist;
            expect(mail.data).to.be.an('object');
            expect(mail.data.attachments).to.be.an('array');
            expect(mail.data.attachments[0]).to.be.an('object');
            expect(mail.data.attachments[0].url)
              .to.be.a('string')
              .to.match(/^https:\/\/s3.amazonaws.com\/default_bucket\/test?.*$/);
          }
          catch (err) {
            return done(err);
          }
          done();
        });
      });
    });
  });

  describe('with no arguments', () => {
    it('should return a function', () => {
      expect(signS3AttachmentUrls()).to.be.a('function');
    });
  });
});


describe('#compile', () => {
  it('should be defined', () => {
    expect(compile).to.be.a('function');
  });

  describe('with a mock S3 instance', () => {
    const s3 = {
      getSignedUrl: function (operation, options, callback) {
        expect(operation, 'getSignedUrl operation').to.be.a('string').to.equal('getObject');
        expect(options, 'getSignedUrl options').to.be.an('object');
        expect(options.Bucket, 'getSignedUrl options.Bucket').to.be.a('string');
        expect(options.Key, 'getSignedUrl options.Key').to.be.a('string');
        callback(null, `mock://${options.Bucket}/${options.Key}`);
      }
    };

    describe('with a mock Nodemailer mail object', () => {
      describe('with no attachments (empty array)', () => {
        it('should return the original mail object unmodified', async () => {
          expect(await compile({ data: { attachments: [] } }, s3, {})).to.eql({ data: { attachments: [] } });
        });
      });

      describe('with no attachments (undefined)', () => {
        it('should return the original mail object unmodified', async () => {
          expect(await compile({ data: { test: 'something' } }, s3, {})).to.eql({ data: { test: 'something' } });
        });
      });

      describe('with an attachment', () => {
        it('should replace attachment s3 options with a signed url', async () => {
          expect(await compile({
              data: {
                attachments: [{ s3: { Bucket: 'example', Key: 'test' } }]
              }
            }, s3, {}))
            .to.eql({
              data: {
                attachments: [{ url: 'mock://example/test' }]
              }
            });
        });

        describe('with a default bucket set', () => {
          describe('with no attachment bucket set', () => {
            it('should use the default bucket', async () => {
              expect(await compile({
                  data: {
                    attachments: [{ s3: { Key: 'test' } }]
                  }
                }, s3, { defaultBucket: 'default_example' }))
                .to.eql({
                  data: {
                    attachments: [{ url: 'mock://default_example/test' }]
                  }
                });
            });
          });

          describe('with an attachment bucket set', () => {
            it('should use the attachment bucket', async () => {
              expect(await compile({
                  data: {
                    attachments: [{ s3: { Bucket: 'example', Key: 'test' } }]
                  }
                }, s3, { defaultBucket: 'default_example' }))
                .to.eql({
                  data: {
                    attachments: [{ url: 'mock://example/test' }]
                  }
                });
            });
          });
        });

        describe('with no default bucket set', () => {
          describe('with no attachment bucket set', () => {
            it('should reject with an error', async () => {
              await expect(compile({
                  data: {
                    attachments: [{ s3: { Key: 'test' } }]
                  }
                }, s3, {}))
                .to.be.rejectedWith(Error, /Bucket/);
              });
          });
        });
      });
    });

    describe('with no arguments', () => {
      it('should return a function', () => {
        expect(signS3AttachmentUrls()).to.be.a('function');
      });
    });
  });
});


