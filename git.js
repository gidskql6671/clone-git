const path = require('path')
const fs = require('fs');
const Local = require('./local.js');
const LocalV2 = require('./localVer2.js');


class Git{
    constructor(localPath = ".", localVer = 1){
        this._localPath = localPath;
        if (!fs.existsSync(localPath))
            fs.mkdirSync(localPath);
            
        this._curLocalRepo = null;
        this.localVer = localVer;
        
        if (localVer == 1){
            this._local = this._getRepoNameList().map(name => new Local(localPath, name));
        }
        else if (localVer == 2){
            this._local = this._getRepoNameList().map(name => new LocalV2(localPath, name));
        }
    }
    
    _getRepoNameList(){
        const files = fs.readdirSync(this._localPath, {withFileTypes: true, encoding: 'utf-8'});
        
        return files.filter(file => file.isDirectory())
                    .filter(({name}) => {
                        const innerFiles = fs.readdirSync(path.join(this._localPath, name), 'utf-8');
                        
                        if (innerFiles.includes(".git")){
                            return true;
                        }
                        return false;
                    })
                    .map(({name}) => name);
    }
    
    init(repoName) { 
        const fileName = path.join(this._localPath, repoName);
        
        if (fs.existsSync(fileName)){
            console.log(`${repoName} 저장소가 이미 있습니다.`);
            return false;
        }
        
        fs.mkdirSync(fileName);
        fs.mkdirSync(path.join(fileName, ".git"));
        fs.mkdirSync(path.join(fileName, ".git", "objects")); 
        fs.mkdirSync(path.join(fileName, ".git", "logs")); 
        fs.writeFileSync(path.join(fileName, ".git", "index"), "", 'utf-8'); 
        fs.mkdirSync(path.join(fileName, ".git", "refs", "heads"),{ recursive: true });
        fs.writeFileSync(path.join(fileName, ".git", "refs", "heads", "main"), ""); 
        
        console.log(`created ${repoName} repository`);
        
        if (this.localVer == 1){
            this._local.push(new Local(this._localPath, repoName));
        }
        else if (this.localVer == 2){
            this._local.push(new LocalV2(this._localPath, repoName));
        }
        
        return true;
    };
    
    status() {
        if (this._curLocalRepo === null){
            const repoList = this._local.map(ele => ele.getName());
            
            repoList.forEach(ele => console.log(`${ele}/`))
        }
        else{
            this._curLocalRepo.printAll();
        }
    }
    statusRemote(){
        if (!this.isCheckouted()){
            console.log("체크아웃을 먼저 해주세요.");
            return false;
        }
        else{
            this._curLocalRepo.printRemote();
        }
    }
    
    checkout(repoName){
        if (repoName === ""){
            this._curLocalRepo = null;
            return true;
        }
        
        const local = this._local.find(ele => ele.getName() === repoName);
        if (typeof local === "undefined"){
            console.log(`${repoName} 저장소는 없습니다.`);
            return false;
        }
        
        this._curLocalRepo = local;
        return true;
    }
    
    makeFile(filename, content){
        if (!this.isCheckouted()){
            console.log("체크아웃을 먼저 해주세요.");
            return false;
        }
        
        this._curLocalRepo.makeFile(filename, content);
        return true;
    }
    updateFile(filename, content){
        if (!this.isCheckouted()){
            console.log("체크아웃을 먼저 해주세요.");
            return false;
        }
        
        this._curLocalRepo.updateFile(filename, content);
    }
    add(name){
        if (!this.isCheckouted()){
            console.log("체크아웃을 먼저 해주세요.");
            return false;
        }
        
        this._curLocalRepo.add(name);
        return true;
    }
    commit(message){
        if (!this.isCheckouted()){
            console.log("체크아웃을 먼저 해주세요.");
            return false;
        }
        
        this._curLocalRepo.commit(message);
        
        return true;
    }
    log(){
        if (!this.isCheckouted()){
            console.log("체크아웃을 먼저 해주세요.");
            return false;
        }
        
        this._curLocalRepo.printRepository();
    }
    push(){
        if (!this.isCheckouted()){
            console.log("체크아웃을 먼저 해주세요.");
            return false;
        }
        
        console.log("push some commits...");
        
        this._curLocalRepo.push();
        
    }
    export(){
        if (!this.isCheckouted()){
            console.log("체크아웃을 먼저 해주세요.");
            return false;
        }
        
        this._curLocalRepo.export();
    }
    // 현재 체크아웃된 레포지토리 이름을 반환
    getCurLocalRepoName() {
        if (this._curLocalRepo === null)
            return "";
        return this._curLocalRepo.getName();
    }
    // 현재 체크아웃된 상태인지 반환
    isCheckouted(){
        return this._curLocalRepo !== null;
    }
}



module.exports = Git;