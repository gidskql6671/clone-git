const path = require('path')
const fs = require('fs');
const Local = require('./local.js');


class Git{
    constructor({gitName = ".mygit"}){
        this._gitName = gitName;
        this._curPath = ".";
        
        this._localRepo = this._getRepo(".");
    }
    
    _getRepo(){
        if (fs.existsSync(path.join(this._curPath, this._gitName))){
            return new Local({curDir: this._curPath, gitName: this._gitName});
        }
        else{
            return null;
        }
    }
    
    init() {
        const curGitPath = path.join(this._curPath, this._gitName);
        if (fs.existsSync(curGitPath)){
            console.log(`이미 초기화 했습니다.`);
            return false;
        }
        
        fs.mkdirSync(curGitPath);
        fs.mkdirSync(path.join(curGitPath, "objects")); 
        fs.mkdirSync(path.join(curGitPath, "logs")); // 헤드나 메인 점이 어떤 명령어에 의해 바꼈는데, 어디서 어디로 바꼈는지의 로그
        fs.writeFileSync(path.join(curGitPath, "index"), "", 'utf-8'); 
        fs.mkdirSync(path.join(curGitPath, "refs", "heads"),{ recursive: true });
        fs.writeFileSync(path.join(curGitPath, "refs", "heads", "main"), "", "utf-8"); 
        
        console.log(`Init Repository`);
        
        this._localRepo = new Local({curDir: this._curPath, gitName: this._gitName});
        
        return true;
    };
    
    status() {
        if (this._localRepo){
            this._localRepo.printAll();
        }
        else{
            console.log("git 저장소가 없습니다.");
        }
    }
    
    // 브렌치 혹은 커밋id를 인자로 받아, 해당 위치로 checkout
    checkout(objId){
        // this._localRepo.checkout(objId); 추후 구현
        
        return true;
    }
    
    add(name){
        return this._localRepo.add(name);
    }
    commit(message){
        return this._localRepo.commit(message);
    }
    log(){
        return this._localRepo.printRepository();
    }
}



module.exports = Git;