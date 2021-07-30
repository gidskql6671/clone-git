const path = require('path')
const fs = require('fs');
const Remote = require('./remote.js');
const { hash } = require('./hash.js');


class Local{
    constructor(dir, name){
        this._name = name;
        this._dir = path.join(dir, name);
        
        this._logPath = path.join(this._dir, ".git", "logs");
        this._remoteDir = path.join(this._dir, ".remote");
        this._indexFile = path.join(this._dir, ".git", "index");
        this._objectsDir = path.join(this._dir, ".git", "objects");
        this._headFile = path.join(this._dir, ".git", "refs", "heads", "main");
        
        this._remote = null;
        if (fs.existsSync(this._remoteDir)){
            this._remote = new Remote(this._remoteDir);
        }
    }
    
    getName(){
        return this._name;
    }
    
    makeFile(name, content){
        const filename = path.join(this._dir, name);
        
        fs.writeFileSync(filename, content);
        
        return true;
    }
    
    updateFile(name, content){
        const filename = path.join(this._dir, name);
        if (!fs.existsSync(filename)){
            console.log("해당 파일이 없습니다.");
            return false;
        }
        
        fs.writeFileSync(filename, content);
        
        return true;
    }
    
    // content를 내용으로 가지는 오브젝트 파일을 만듬
    _makeObject(content){
        // sha1을 적용하면 좋지만, 바닐라 js만 써야하니 그냥 적당한 hash함수를 만들었다.
        const objectId = hash(content);
        const objectIdDir = objectId.substring(0, 2);
        const objectIdFile = objectId.substring(2);
        const objectDirPath = path.join(this._objectsDir, objectIdDir);
        const objectPath = path.join(objectDirPath, objectIdFile);
        
        if (!fs.existsSync(objectDirPath)){
            fs.mkdirSync(objectDirPath);
        }
        if (!fs.existsSync(objectPath)){
            fs.writeFileSync(objectPath, content, 'utf-8');
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
        const indexArray = indexString.split("\n")
        .map(line => {
            const array = line.split(" ");
            const filename = array.slice(0, -1).join(" ");
            const blobId = array[array.length - 1];
            
            
            return {filename: filename, blobId: blobId};
        })
        
        return this._makeTreeRecurs(indexArray);
    }
    _makeTreeRecurs(indexArray, dirname = "", pos = 0){
        const blobList = indexArray.filter(({filename}) => filename.split("/").length === pos + 1)
                            .filter(({filename}) => filename.startsWith(dirname));
        const treeList = indexArray.filter(({filename}) => filename.split("/").length > pos + 1);
        let content = ``;
        
        const blobContent = blobList.map(({filename, blobId}) => {
            const file = filename.split("/").slice(-1)[0];
            
            return `blob ${blobId} ${file}`;
        });
        
        
        const treeObjectArray = treeList.map(({filename, blobId}) => {
            const firstDir = filename.split("/").slice(0, pos + 1).join("/");
            
            const treeId = this._makeTreeRecurs(indexArray, `${dirname}${firstDir}/`, pos + 1);
            
            const curDir = firstDir.slice(-1)[0];
            
            return {filename: curDir, treeId: treeId};
        })
        
        // 중복 값을 제거
        const treeContent = treeObjectArray.filter((ele, index) => {
            return index === treeObjectArray.findIndex((ele2) => {
                return ele.filename === ele2.filename && ele.treeId === ele2.treeId
            })
        }).map(ele => `tree ${ele.treeId} ${ele.filename}`);
        
        const totalContent = treeContent.concat(blobContent).join("\n");
        content += totalContent;
        
        return this._makeObject(`tree\n${content}`);
    }
    
    // commit 파일을 만들고, object Id를 반환.
    _makeCommit(treeObjId, log, parent = null){
        let content = `commit\ntree ${treeObjId}\n`;
        if (parent !== null){
            content += `parent ${parent}\n`;
        }
        else{
            content += `parent null\n`;
        }
        content += `log\n${log}`;
        
        return this._makeObject(content);
    }
    
    // objectId에 해당하는 CommitObj를 가져옴
    _getCommitObj(objectId){
        const objectIdDir = objectId.substring(0, 2);
        const objectIdFile = objectId.substring(2);
        const objectPath = path.join(this._objectsDir, objectIdDir, objectIdFile);
        
        if (!fs.existsSync(objectPath)){
            throw new Error("해당 Commit 오브젝트가 없습니다.");
        }
        /*
        commit
        tree treeObjId
        parent [parentObjId | null] 
        log
        logmessage
        */
        
        const data = fs.readFileSync(objectPath, 'utf-8');
        const [type, tree, parent, ...log] = data.split("\n");
        
        const obj = {
            tree: tree.split(" ")[1],
            parent: parent.split(" ")[1] === "null" ? null : parent.split(" ")[1],
            log: log.split("\n").slice(1).join('\n')
        };
        
        return obj;
    }
    // tree로부터 filename에 해당하는 blobId를 가져옴
    _getBlobIdFromTreeByFilename(tree, filename){
        const objectIdDir = tree.substring(0, 2);
        const objectIdFile = tree.substring(2);
        const objectPath = path.join(this._objectsDir, objectIdDir, objectIdFile);
        
        if (!fs.existsSync(objectPath)){
            throw new Error("해당 Tree 오브젝트가 없습니다.");
        }
        /*
        tree
        blob blobId
        blob blodId
        ...
        tree treeId
        */
       
        const data = fs.readFileSync(objectPath, 'utf-8');
        let dirname = "";
        if (filename.split("/").length > 1){
            dirname = filename.split("/")[0];
        }
        let blobId = null;
        
        data.split("\n").slice(1)
        .filter(line => {
            const [type, objectId, filename] = line.split(" ");
            
            if (dirname === "")
                return type === "blob";
            else
                return type === "tree";
        })
        .forEach(line => {
            const [type, objectId, filename] = line.split(" ");
            
            if (dirname === ""){
                blobId = objectId;
            }
            else{
                if (dirname === filename){
                    this._getBlobIdFromTreeByFilename(objectId, filename.split("/").slice(1));
                }
            }
        })
        
        return blobId;
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
    
        fs.writeFileSync(this._indexFile, newData, 'utf-8');
        
        return true;
    }
    
    // Index 파일로부터 문자열을 가져온다.
    _getStringFromIndex(){
        if (!fs.existsSync(this._indexFile)){
            console.log("index 파일이 없습니다.");
            return "";
        }
        
        return fs.readFileSync(this._indexFile, 'utf-8');
    }
    // Index 파일로부터 Filepath에 해당하는 objectId를 가져온다.
    // 없다면 null 반환.
    _getObjectIdFromIndexByFilename(filename){
        const data = this._getStringFromIndex();
        
        
        const line = data.split("\n").find(line => {
            const array = line.split(" ");
            const indexFilepath = array.slice(0, -1).join(" ");
            
            if (indexFilepath === filename)
                return true;
            return false;
        });
        if (typeof line === "undefined")
            return null;
            
        // 가장 마지막 값이 blob의 obj id이다.
        return line.split(" ")[lineArray.length - 1];
    }
    // 마지막 커밋의 id를 가져온다.
    // 없다면 null 반환
    _getLastCommitId(){
        const lastCommidId = fs.readFileSync(this._headFile, 'utf-8');
        
        if (lastCommidId === ""){
            return null;
        }
        return lastCommidId;
    }
    _setLastCommitId(commitId){
        fs.writeFileSync(this._headFile, commitId, 'utf-8');
        
        return true;
    }
    // 마지막 커밋으로부터 filename에 해당하는 blob Id를 가져온다.
    _getBlobIdFromLastCommitByFilename(filename){
        const lastCommitId = this._getLastCommitId();
        
        const commitObj = this._getCommitObj(lastCommitId);
        const lastTreeObjId = commitObj.tree;
        
        return this._getBlobIdFromTreeByFilename(lastTreeObjId, filename);
    }
    
    // add 명령어
    add(filename){
        const filepath = path.join(this._dir, filename);
        const content = fs.readFileSync(filepath, 'utf-8');
        
        const blobIdFromContent = this._makeBlob(content);
        const blobIdFromIndex = this._getObjectIdFromIndexByFilename(filename);
        
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
    // commit 명령어
    commit(message){
        const treeId = this._makeTree();
        const parentId = this._getLastCommitId();
        const commitId = this._makeCommit(treeId, log, parentId);
        
        this._setLastCommitId(commitId);
    }
    status(){
        const indexString = this._getStringFromIndex();
        const indexArray = indexString.split("\n")
        .map(line => {
            const array = line.split(" ");
            const filename = array.slice(0, -1).join(" ");
            const blobId = array[array.length - 1];
            
            return {filename: filename, blobId: blobId};
        })
        
        this._status("./", indexArray)
        .forEach(ele => {
            console.log(`filename: ${ele.filename}, status: ${ele.status}`);
        });
    }
    _status(dirname, indexArray){
        const files = fs.readdirSync(dirname, {withFileTypes: true, encoding: 'utf-8'});
        
        return files.filter(({name}) => name !== ".git")
        .flatMap(file => {
            if (file.isDirectory()){
                return this._status(path.join(dirname, file.name), indexArray);
            }
            
            const filename = file.name;
            const content = fs.readdirSync(path.join(dirname, filename), 'utf-8');
            const indexElement = indexArray.find(ele => ele.filename === filename);
            // untracked
            if (typeof indexElement === "undefined"){
                return {filename: path.join(dirname, filename).substring(2), blobId: null, status: "untracked"};
            }
            const blobId = this._makeBlob(content);
            
            if (indexElement.blobId === blobId){
                const BlobIdWhenLastCommit = this._getBlobIdFromLastCommitByFilename(filename);
                // unmodified  마지막 커밋이랑 비교했는데 내용이 그대로면 unmodified
                if (blobId === BlobIdWhenLastCommit){
                    return {filename: path.join(dirname, filename).substring(2), blobId: blobId, status: "unmodified"};
                }
                // staged  마지막 커밋이랑 비교했는데 내용이 바뀌면 staged
                else{
                    return {filename: path.join(dirname, filename).substring(2), blobId: blobId, status: "staged"};
                }
            }
            // modified
            else{
                return {filename: path.join(dirname, filename).substring(2), blobId: blobId, status: "modified"};
            }
        })
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
        this._printWorkingDir();
        
    }
    _printWorkingDir(dirname = "./"){
        const files = fs.readdirSync(path.join(this._dir, dirname), {encoding: 'utf-8', withFileTypes: true});
        
        files.filter(({name}) => name !== ".git")
        .forEach(file => {
            const filename = file.name;
            
            if (!file.isDirectory()){
                const stat = fs.statSync(path.join(this._dir, dirname, filename));
                console.log(`${dirname.slice(2)}${filename}(${stat.size}) ${stat.mtime}`);
            }
            else{
                this._printWorkingDir(`${dirname}${filename}/`);
            }
        })
    }
    
    printStagingArea(){
        console.log("---Staging Area/");
        this._getStringFromIndex().split("\n")
        .forEach(line => {
            const array = line.split(" ");
            const filename = array.slice(0, -1).join(" ");
            const blobId = array[array.length - 1];
            
            const stat = fs.statSync(path.join(this._objectsDir, blobId.substring(0,2), blobId.substring(2)));
            if (stat.size > 0)
                console.log(`${filename}(${stat.size}) ${stat.mtime}`);
        })
        
    }
    printRepository(){
        console.log("---Git Repository/");
        const lastCommitId = this._getLastCommitId();
        
        if (lastCommitId !== null){
            this._printCommitLog(lastCommitId);
        }
    }
    _printCommitLog(commitId){
        const commitPath = path.join(this._objectsDir, commitId.substring(0,2), commitId.substring(2))
        const stat = fs.statSync(commitPath);
        const commitFile = fs.readFileSync(commitPath, 'utf-8');
        
        const [type, tree, parent, ...log] = commitFile.split("\n");
        
        console.log(commitId);
        console.log(log.join("\n"));
        
        if (parent.split(" ")[1] !== "null")
            this._printCommitLog(parent.split(" ")[1]);
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