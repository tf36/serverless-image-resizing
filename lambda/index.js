const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;
const ALLOWED_RESOLUTIONS = process.env.ALLOWED_RESOLUTIONS ? new Set(process.env.ALLOWED_RESOLUTIONS.split(/\s*,\s*/)) : new Set([]);

exports.handler = function(event, context, callback) {
    const key = event.queryStringParameters.key;
    const match = key.match(/((\d*)x(\d*))\/(.*)/);

    //Check if requested resolution is allowed
    if(0 != ALLOWED_RESOLUTIONS.size && !ALLOWED_RESOLUTIONS.has(match[1]) ) {
        callback(null, {
            statusCode: '403',
            headers: {},
            body: '',
        });

        return;
    }

    const width = (match[2] && !isNaN(match[2]) && parseInt(match[2], 10)) || null;
    const height = (match[3] && !isNaN(match[3]) && parseInt(match[3], 10)) || null;
    const originalKey = match[4];
    const saveKey = 'photos/' + (width || '') + 'x' + (height || '') + '/' + originalKey;

    //Simple check if proper arguments given
    if (!width && !height) {
        callback(null, {
            statusCode: '403',
            headers: {},
            body: '',
        });

        return;
    }

    S3.getObject({Bucket: BUCKET, Key: `photos/original/${originalKey}`}).promise()
        .then(data => Sharp(data.Body)
            .resize(width, height)
            .embed()
            .toBuffer()
        )
        .then(buffer => S3.putObject({
                Body: buffer,
                Bucket: BUCKET,
                ContentType: 'image/png',
                Key: saveKey,
            }).promise()
        )
        .then(() => callback(null, {
                statusCode: '301',
                headers: {'location': `${URL}/${saveKey}`},
                body: '',
            })
        )
        .catch(err => callback(err))
}

