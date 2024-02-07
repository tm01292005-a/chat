import ffmpeg from 'fluent-ffmpeg';
import { Duplex } from 'stream';
import fs from 'fs';

function bufferToStream(buffer) {
    let tmp = new Duplex();
    tmp.push(buffer);
    tmp.push(null);
    return tmp;
}

function convertBuffer(inputBuffer, callback) {
    let outputBuffer = Buffer.alloc(0);

    ffmpeg()
        .input(bufferToStream(inputBuffer))
        .videoCodec('copy')
        .audioCodec('copy')
        .outputOptions('-movflags faststart')
        .outputFormat('mp4')
        .on('end', function() { callback(null, outputBuffer); })
        .on('error', function(err) { callback(err); })
        .on('data', function(data) { outputBuffer = Buffer.concat([outputBuffer, data]); })
        .run();
}

let inputBuffer = fs.readFileSync('fileName');
convertBuffer(inputBuffer, function(err, outputBuffer) {
    if (err) {
        console.log('Error: ', err);
    } else {
        fs.writeFileSync('newFileName', outputBuffer);
    }
});