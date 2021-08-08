const path = require('path')
const fs = require('fs');
const { hash } = require('./hash.js');
require('colors');

const pathSep = /\/|\\/;

class Local{
    constructor({curDir = ".", gitName = ".mygit"}){
        this._curDir = curDir;
        this._gitName = gitName;
        
        this._gitPath = path.join(this._curDir, this._gitName);
        this._logPath = path.join(this._gitPath, "logs");
        this._indexFile = path.join(this._gitPath, "index");
        this._objectsDir = path.join(this._gitPath, "objects");
        this._headFile = path.join(this._gitPath, "refs", "heads", "main");
        
        this._ignores = [
            ".git",
            gitName,
            "node_modules"
        ];
    }
    
    // content를 내용으로 가지는 오브젝트 파일을 만듬
    _makeObject(content){
        // sha1을 이용한 hash함수를 만들었다.
        const objectId = hash(content); 
        const objectIdDir = objectId.substring(0, 2);
        const objectIdFile = objectId.substring(2);
        const objectDirPath = path.join(this._objectsDir, objectIdDir);
        const objectPath = path.join(objectDirPath, objectIdFile);
        
        if (!fs.existsSync(objectDirPath)){
            fs.mkdirSync(objectDirPath, {recursive: true});
        }
        if (!fs.existsSync(objectPath)){
            fs.writeFileSync(objectPath, content, 'utf-8');
        }
        
        return objectId;
    }
    
    // Blob 파일을 만들고, object Id를 반환.
    _makeBlob(content){
        return this._makeObject(`${content}`);
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
        const blobList = indexArray.filter(({filename}) => filename.split(pathSep).length === pos + 1)
                            .filter(({filename}) => filename.startsWith(dirname));
        const treeList = indexArray.filter(({filename}) => filename.split(pathSep).length > pos + 1);
        let content = ``;
        
        const blobContent = blobList.map(({filename, blobId}) => {
            const file = filename.split(pathSep).slice(-1)[0];
            
            return `blob ${blobId} ${file}`;
        });
        
        
        const treeObjectArray = treeList.map(({filename, blobId}) => {
            const firstDir = filename.split(pathSep).slice(0, pos + 1).join(path.path.sep);
            
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
        
        return this._makeObject(`${content}`);
    }
    
    // commit 파일을 만들고, object Id를 반환.
    _makeCommit(treeObjId, log, parent = ""){
        const content = `${treeObjId}\n${parent}\n${log}`;
        
        return this._makeObject(content);
    }
    
    // objectId에 해당하는 CommitObj를 가져옴
    _getCommitObj(objectId){
        if (objectId === ""){
            throw new Error(`objectId가 비어있습니다.`);
        }
        
        const objectIdDir = objectId.substring(0, 2);
        const objectIdFile = objectId.substring(2);
        const objectPath = path.join(this._objectsDir, objectIdDir, objectIdFile);
        
        if (!fs.existsSync(objectPath)){
            throw new Error("해당 Commit 오브젝트가 없습니다.");
        }
        /*
        treeObjId
        [parentObjId | ""] 
        logmessage
        */
       
        const data = fs.readFileSync(objectPath, 'utf-8');
        const [tree, parent, ...log] = data.split("\n");
        
        const obj = {
            tree: tree,
            parent: parent === "" ? null : parent,
            log: log.join('\n')
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
        blob blobId
        blob blodId
        ...
        tree treeId
        */
       
        const data = fs.readFileSync(objectPath, 'utf-8');
        let dirname = "";
        if (filename.split(pathSep).length > 1){
            dirname = filename.split(pathSep)[0];
        }
        let blobId = null;
        
        data.split("\n")
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
                    this._getBlobIdFromTreeByFilename(objectId, filename.split(pathSep).slice(1).join(path.sep));
                }
            }
        })
        
        return blobId;
    }
    // tree로부터 모든 blob 객체 Index형태로 가져옴.
    _getBlobObjFromTreeFormatIndex(tree, dir = ""){
        const objectIdDir = tree.substring(0, 2);
        const objectIdFile = tree.substring(2);
        const objectPath = path.join(this._objectsDir, objectIdDir, objectIdFile);
        
        if (!fs.existsSync(objectPath)){
            throw new Error("해당 Tree 오브젝트가 없습니다.");
        }
        
        const data = fs.readFileSync(objectPath, 'utf-8');
        
        return data.split("\n")
        .map(line => {
            const [type, objectId, filename] = line.split(" ");
            
            if (type === "blob")
                return `${path.join(dir, filename)} ${objectId}`;
            else
                return this._getBlobObjFromTree(objectId, path.join(dir, filename));
        }).join("\n");
    }
    // 인덱스에 filename과 blobId를 추가한다
    _addIndex(filename, blobId){
        const str = fs.readFileSync(this._indexFile, {encoding: 'utf-8'});
        if (str.length === 0){
            fs.appendFileSync(this._indexFile, `${filename} ${blobId}`);
        }
        else{
            fs.appendFileSync(this._indexFile, `\n${filename} ${blobId}`);
        }
        
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
            
        return line.split(" ")[1];
    }
    // 마지막 커밋의 id를 가져온다.
    // 없다면 null 반환
    _getLastCommitId(){
        const lastCommidId = fs.readFileSync(this._headFile, 'utf-8');
        
        return lastCommidId;
    }
    // Head에 마지막 커밋을 설정한다.
    _setLastCommitId(commitId){
        fs.writeFileSync(this._headFile, commitId, 'utf-8');
        
        return true;
    }
    // 마지막 커밋으로부터 filename에 해당하는 blob Id를 가져온다.
    _getBlobIdFromLastCommitByFilename(filename){
        const lastCommitId = this._getLastCommitId();
        
        if (lastCommitId === ""){
            return "";
        }
        
        const commitObj = this._getCommitObj(lastCommitId);
        const lastTreeObjId = commitObj.tree;
        
        return this._getBlobIdFromTreeByFilename(lastTreeObjId, filename);
    }
    // 마지막 커밋과 인덱스를 같은지 비교함.
    // 커밋이력이 없으면 항상 false 반환
    _equalsIndexToLastCommit(){
        const index = this._getStringFromIndex();
        const lastCommit = this._getLastCommitId();
        if (lastCommit === ""){
            return false;
        }
        const {tree} = this._getCommitObj(lastCommit);
        
        const blobInLastCommit = this._getBlobObjFromTreeFormatIndex(tree);
        
        console.log(blobInLastCommit);
        
    }
    
    // add 명령어
    add(filename){
        const filepath = path.join(this._curDir, filename);
        if (!fs.existsSync(filepath)){
            console.log("해당 파일이 없습니다.");
            return false;
        }
        
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
        const parentId = this._getLastCommitId();
        if (parentId !== "" && this._equalsIndexToLastCommit()){
            console.log("변경된 점이 없습니다.");
            return false;
        }
        
        const treeId = this._makeTree();
        const commitId = this._makeCommit(treeId, message, parentId);
        
        this._setLastCommitId(commitId);
        
        return true;
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
        
        // 수정된 파일을 뽑아낸다.
        const files = this._status(this._curDir, indexArray).filter(ele => ele.status !== "unmodified");
        if (files.length === 0){
            console.log('nothing to commit, working tree clean');
            return true;
        }
        
        // untracked와 modified를 따로 출력할 것이다.
        const untrackedFiles = files.filter(ele => ele.status === "untracked");
        const modifiedFiles = files.filter(ele => ele.status !== "untracked");
        
        if (modifiedFiles.length >= 0){
            console.log(`Changes not staged for commit:`);
            console.log(`  (use "git add/rm <file>..." to update what will be committed)`);
            console.log(`  (use "git restore <file>..." to discard changes in working directory)`);
            modifiedFiles.forEach(ele => {
                const statusStr = `${ele.stauts}:`.padEnd(11, " ");
                console.log(`\t${statusStr} ${ele.filename}`.red);
            });
        }
        if (untrackedFiles.length > 0){
            console.log(`Untracked files:\n  (use "git add <file>..." to include in what will be committed)`);
            untrackedFiles.forEach(ele => {
                // nodejs 자체의 색입히는 기능
                // console.log(`\u001b[31${ele.filename}\u001b[0`);
                // 바퀴를 다시 발명하지 말자.
                console.log(`\t${ele.filename}`.red);
            });
            console.log(`\nno changes added to commit (use "git add" and/or "git commit -a")`);
        }
    }
    _status(dirname, indexArray){
        const files = fs.readdirSync(dirname, {withFileTypes: true, encoding: 'utf-8'});
        
        return files.filter(({name}) => !this._ignores.includes(name))
        .flatMap(file => {
            if (file.isDirectory()){
                return this._status(path.join(dirname, file.name), indexArray);
            }
            
            const filename = file.name;
            const content = fs.readFileSync(path.join(dirname, filename), 'utf-8');
            const indexElement = indexArray.find(ele => ele.filename === filename);
            // untracked
            if (typeof indexElement === "undefined"){
                return {filename: path.join(dirname, filename), blobId: null, status: "untracked"};
            }
            const blobId = this._makeBlob(content);
            
            if (indexElement.blobId === blobId){
                const BlobIdWhenLastCommit = this._getBlobIdFromLastCommitByFilename(filename);
                // unmodified  마지막 커밋이랑 비교했는데 내용이 그대로면 unmodified
                if (blobId === BlobIdWhenLastCommit){
                    return {filename: path.join(dirname, filename), blobId: blobId, status: "unmodified"};
                }
                // staged  커밋이력이 없거나 마지막 커밋이랑 비교했는데 내용이 바뀌면 staged
                else{
                    return {filename: path.join(dirname, filename), blobId: blobId, status: "staged"};
                }
            }
            // modified
            else{
                return {filename: path.join(dirname, filename), blobId: blobId, status: "modified"};
            }
        })
    }
    printCommitLog(){
        console.log("--- Commit Logs ---");
        const lastCommitId = this._getLastCommitId();
        
        if (lastCommitId !== ""){
            this._printCommitLog(lastCommitId);
        }
    }
    _printCommitLog(commitId){
        const commitPath = path.join(this._objectsDir, commitId.substring(0,2), commitId.substring(2))
        const stat = fs.statSync(commitPath);
        const commitFile = fs.readFileSync(commitPath, 'utf-8');
        
        const [tree, parent, ...log] = commitFile.split("\n");
        
        console.log(commitId, stat.mtime);
        console.log(log.join("\n"));
        
        if (parent !== "")
            this._printCommitLog(parent);
    }
}



module.exports = Local;