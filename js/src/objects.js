import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

// sha1 방식의 해쉬함수
function _hash(item){
    return crypto.createHash('sha1').update(item).digest('hex');
}

function _makeObject(gitPath, content){
    // sha1을 이용한 hash함수를 만들었다.
    const objectId = _hash(content); 
    const objectIdDir = objectId.substring(0, 2);
    const objectIdFile = objectId.substring(2);
    const objectDirPath = path.join(gitPath, "objects", objectIdDir);
    const objectPath = path.join(objectDirPath, objectIdFile);
    
    if (!fs.existsSync(objectDirPath)){
        fs.mkdirSync(objectDirPath, {recursive: true});
    }
    if (!fs.existsSync(objectPath)){
        fs.writeFileSync(objectPath, content, 'utf-8');
    }
    
    return objectId;
}

function makeBlob(gitPath, content){
    return _makeObject(gitPath, content);
}
function makeTree(content){
    return _makeObject(content);
}
function makeCommit(content){
    return _makeObject(content);
}


export { makeBlob, makeTree, makeCommit };