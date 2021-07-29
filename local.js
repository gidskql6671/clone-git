const path = require('path')
const fs = require('fs');
const File = require('./file.js');
const Remote = require('./remote.js');
const { hash } = require('./hash.js');


class Local{
    constructor(dir, name){
        this._name = name;
        this._dir = path.join(dir, name);
        this._repoPath = path.join(this._dir, ".git", "objects");
        this._logPath = path.join(this._dir, ".git", "logs");
        this._remoteDir = path.join(this._dir, ".remote");
        this._indexFile = path.join(this._dir, ".git", "index");
        
        this._objectsDir = path.join(this._dir, ".git", "objects");
        
        this._files = this._getWorkingDirFiles();
        this._index = this._getIndexFiles();
        this._repo = this._getRepositoryFiles();
        
        this._remote = null;
        if (fs.existsSync(this._remoteDir)){
            this._remote = new Remote(this._remoteDir);
        }
    }
    
    _getWorkingDirFiles(){
        const files = fs.readdirSync(this._dir);
        
        return files.filter(file => !file.startsWith("."))
                .map(filename => {
                    const filePath = path.join(this._dir, filename);
                    const stat = fs.statSync(filePath);
                    const content = fs.readFileSync(filePath);
                
                    
                    return new File({name: filename, content: content, time: stat.mtime, size: stat.size});
                })
        
    }
    _getIndexFiles(){
        const indexFileData = fs.readFileSync(this._indexFile);
        
        if (indexFileData.length === 0){
            return [];
        }
        
        return JSON.parse(indexFileData).map(file => new File(file));    
    }
    _getRepositoryFiles(){
        const files = fs.readdirSync(this._repoPath);
        
        return files.sort((a, b) => a - b)
                    .map(filename => {
                        const filePath = path.join(this._repoPath, filename);
                        return JSON.parse(fs.readFileSync(filePath));
                    })
                    .map(commit => {
                        commit.files = commit.files.map(file => new File(file));
                        return commit;
                    })
    }
    
    getName(){
        return this._name;
    }
    
    makeFile(name, content){
        const filename = path.join(this._dir, name);
        
        fs.writeFileSync(filename, content);
        const stat = fs.statSync(filename);
        
        const file = new File({name: name, content: content, time: stat.birthtime, size: stat.size});
        this._files.push(file);
        file.print();
        
        return true;
    }
    
    updateFile(name, content){
        const filename = path.join(this._dir, name);
        if (!fs.existsSync(filename)){
            console.log("해당 파일이 없습니다.");
            return false;
        }
        
        fs.writeFileSync(filename, content);
        
        const stat = fs.statSync(filename);
        const file = this._files.find(ele => ele.getName() === name);
        file.setContent(content);
        file.setSize(stat.size);
        file.setTime(stat.mtime);
        if (file.getStatus() !== "Untracked"){
            file.setStatus("Modified");
        }
        file.print();
        
        return true;
    }
    
    // content를 내용으로 가지는 오브젝트 파일을 만듬
    _makeObject(content){
        // sha1을 적용하면 좋지만, 바닐라 js만 써야하니 그냥 적당한 hash함수를 만들었다.
        const objectId = hash(`blob\n${content}`);
        const objectIdDir = objectId.substring(0, 2);
        const objectIdFile = objectId.substring(2);
        const objectPath = path.join(this._objectsDir, objectIdDir, objectIdFile);
        
        if (!fs.existsSync(objectPath)){
            fs.writeFileSync(objectPath, content);
        }
        
        return objectId;
    }
    
    // Blob 파일을 만들고, object Id를 반환.
    _makeBlob(content){
        return this._makeObject(`blob\n${content}`);
    }
    
    // Index를 바탕으로 Tree를 만들고, object Id를 반환
    _makeTree(){
        const indexString = this._getStringFromIndex();
        
        return this._makeObject(`tree\n${indexString}`);
    }
    
    // commit 파일을 만들고, object Id를 반환.
    _makeCommit(treeObjId, log, parent = ""){
        let content = `commit\ntree ${treeObjId}\n`;
        if (parent.length > 0){
            content += `parent ${parent}\n`;
        }
        content += `\n${log}`;
        
        return this._makeObject(content);
    }
    
    _addIndex(filename, blobId){
        fs.appendFileSync(this._indexFile, `\n${filename} ${blobId}`);
        
        return true;
    }
    // index의 filepath 파일의 objectId를 변경한다.
    // 딱 그 위치만 덮어쓰기하면 될 것같은데, 아직 js로는 파일 스트림을 잘 못다루겠다...
    _modifyIndex(filename, newBlobId){
        const data = this._getStringFromIndex();
        
        const newData = data.split("\n").map(line => {
            const array = line.split(" ");
            const indexFilename = array.slice(0, -1).join(" ");
            
            if (indexFilename !== filename)
                return line;
            
            const blob = this._makeBlob(newBlobId);
            
            return `${indexFilename} ${blob}`;
        })
        .join("\n");
    
        fs.writeFileSync(this._indexFile, newData);
        
        return true;
    }
    
    // Index 파일로부터 문자열을 가져온다.
    _getStringFromIndex(){
        if (!fs.existsSync(this._indexFile)){
            console.log("index 파일이 없습니다.");
            return "";
        }
        
        return fs.readFileSync(this._indexFile);
    }
    // Index 파일로부터 Filepath에 해당하는 objectId를 가져온다.
    // 없다면 null 반환.
    _getObjectIdFromIndexByFilename(filename){
        const data = this._getStringFromIndex();
        
        
        const lineArray = data.split("\n").find(line => {
            const array = line.split(" ");
            const indexFilepath = array.slice(0, -1).join(" ");
            
            if (indexFilepath === filename)
                return true;
            return false;
        }).split(" ");
        
        if (typeof lineArray === "undefined")
            return null;
            
        // 가장 마지막 값이 blob의 obj id이다.
        return lineArray[lineArray.length - 1];
    }
    add2(filename){
        const filepath = path.join(this._dir, filename);
        const content = fs.readFileSync(filepath);
        
        const blobIdFromContent = this._makeBlob(content);
        const blobIdFromIndex = this._getObjectIdFromIndexByFilepath(filename);
        
        // 새로 만든 파일이다.
        if (blobIdFromIndex === null){
            this._addIndex(filename, blobIdFromContent);
        }
        // 변한게 없다.
        else if (blobIdFromIndex === blobIdFromContent){
            console.log(`${filename} 파일은 변경된 점이 없습니다.`);
        }
        // 변했다.
        else{
            this._modifyIndex(filename, blobIdFromContent);
        }
    }
    
    add(name){
        const file = this._files.find(ele => ele.getName() === name);
        if (typeof file === "undefined"){
            console.log(`${name} 파일은 존재하지 않습니다.`);
            return;
        }
        
        file.setStatus("Staged");
        // 같은 객체를 넣으면, add 이후 update하면 working space와 index가 같이 바뀜
        this._index.push(new File({name: file.getName(), content: file.getContent(),
                                   time: file.getTime(), size: file.getSize(), status: "Staged"}));
        fs.writeFileSync(this._indexFile, JSON.stringify(this._index));
        this.printStagingArea();
    }
    commit(message){
        if (this._index.length === 0){
            console.log("스테이지된 파일이 없습니다.");
            return false;
        }
        
        const current = new Date();
        const commited = {
            message: message,
            time: current,
            files: this._index.map(ele => {
                    const workFile = this._files.find(workEle => workEle.getName() === ele.getName());
                    workFile.setStatus("Unmodified");
                    
                    return new File({name: ele.getName(), content: ele.getContent(), 
                                     time: current, size: ele.getSize(), status: "Unmodified"});
                })
            }
        
        this._repo.push(commited);
        
        const version = fs.readdirSync(this._repoPath).length;
        const filePath = path.join(this._repoPath, String(version));
        fs.writeFileSync(filePath, JSON.stringify(commited));
        
        
        console.log("---commit files/");
        console.log(`commit "${commited.message}"`);
        commited.files.forEach(file => file.print());
        
        this._index = []; // index를 비워줌
        
        return true;
    }
    push(){
        if (this._remote === null){
            this._remote = new Remote(this._remoteDir);
        }
        
        this._remote.push(this._getRepositoryFiles());
    }
    export(){
        const today = new Date();
        
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const date = today.getDate();
        
        const hours = today.getHours();
        const minutes = today.getMinutes();
        
        const filename = `${this._name}-${year}${month}${date}-${hours}${minutes}.git`;
        
        const log = this._repo.reduce((prev, commit) => prev + JSON.stringify(commit), "")
        
        fs.writeFileSync(path.join(this._logPath, filename), log);
        
        console.log(`export ${filename}`);
    }
    
    printAll(){
        this.printWorkingDir();
        console.log("");
        this.printStagingArea();
        console.log("");
        this.printRepository();
    }
    printWorkingDir(){
        console.log("---Working Directory/");
        this._files.forEach(ele => ele.print());
    }
    printStagingArea(){
        console.log("---Staging Area/");
        this._index.forEach(ele => ele.print());
    }
    printRepository(){
        console.log("---Git Repository/");
        this._repo.forEach(version => {
            console.log(`commit "${version.message}"`);
            version.files.forEach(file => {
                file.print()
            });
            console.log("");
        });
    }
    printRemote(){
        if (this._remote === null){
            console.log("해당 저장소가 없습니다.");
            return false;
        }
        
        this._remote.print();
        return true;
    }
}



module.exports = Local;