
import { expect } from 'chai';

import {
  default as signS3AttachmentUrls,
  compile
} from '../src/index.js';


describe('#signS3AttachmentUrls', () => {
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
        callback(null, `mock://${options.Bucket}${options.Key}`);
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
                attachments: [{ s3: { Bucket: 'example', Key: '/test' } }]
              }
            }, s3, {}))
            .to.eql({
              data: {
                attachments: [{ url: 'mock://example/test' }]
              }
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

