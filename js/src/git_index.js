import fs from 'fs';
import path from 'path';

function addFileToIndex(gitPath, filename, blobId){
    const indexFilePath = path.join(gitPath, "index");
    
    if (!fs.existsSync(indexFilePath)){
        fs.writeFileSync(indexFilePath, `${filename} ${blobId}`, { encoding: 'utf-8' });
    }
    else{
        fs.appendFileSync(indexFilePath, `\n${filename} ${blobId}`, { encoding: 'utf-8' });
    }
    
    return true;
}

function modifyFileInIndex(gitPath, filename, newBlobId){
    const indexFilePath = path.join(gitPath, "index");
    
    const content = fs.readFileSync(indexFilePath, 'utf-8');
    const lines = content.split("\n");
    let fileCursor = 0;
    
    for(let i = 0; i < lines.length; i++){
        const line = lines[i];
        const [lineFilename, lineBlobId] = line.split(" ");
        
        if (filename === lineFilename){
            // 파일 이름의 바이트 수 + 1(스페이스바의 바이트 수)
            fileCursor += Buffer.from(lineFilename).length + 1;
            
            const fd = fs.openSync(indexFilePath,'r+');
            fs.writeSync(fd, newBlobId, fileCursor, 'utf-8');
            fs.close(fd);
            
            break;
        }
        else{
            // 해당 라인의 바이트 수 + 1(\n의 바이트 수)
            // Buffer로 바꾼 이유는 String의 length를 구하면, 한글같이 utf-8로 표현된 애들의 길이가 달라짐
            fileCursor += Buffer.from(line).length + 1;
        }
    }
}

function getIndexFile(gitPath){
    const indexFilePath = path.join(gitPath, "index");
    
    if (!fs.existsSync(indexFilePath)){
        return [];
    }
    
    const content = fs.readFileSync(indexFilePath, 'utf-8');
    
    return content.split("\n").map(line => {
        const [filename, objectId] = line.split(" ");
        return {filename: filename, objectId: objectId};
    });
}

export { addFileToIndex, modifyFileInIndex, getIndexFile };