import path from 'path';
import fs from 'fs';
import { add, log, status, commit } from './local.js';


const funcMapping = {
    "init": init,
    "add": add,
    "log": log,
    "status": status,
    "commit": commit
}

function git({gitName = ".mygit"}){
    const argv = process.argv;
    const argc = process.argv.length;
    
    // 명랭행 인자가 2개 이하인 경우
    if (argc < 3){
        printUsage();
        return false;
    }
    // 해당 명령어가 없는 경우
    if (!funcMapping.hasOwnProperty(argv[2])){
        printUsage();
        return false;
    }
    
    const func = funcMapping[argv[2]];
    const args = argv.slice(3);
    
    const result = func(gitName, args);
    
    console.log(result.message);
    
    if (result.status === 0){
        return true;
    }
    
    // status에 따라 추가 작업을 할 수도?
    return false;
}

function printUsage(){
    console.log(`usage: node git <command> [<args>]`);
    console.log(`\nThese are Git commands`);
    console.log(`   ${"init".padEnd(17)} Create an empty Git repository or reinitialize an existing one`);
    console.log(`   ${"add".padEnd(17)} Add file contents to the index`);
    console.log(`   ${"log".padEnd(17)} Show commit logs`);
    console.log(`   ${"status".padEnd(17)} Show the working tree status`);
    console.log(`   ${"commit".padEnd(17)} Reco rd changes to the repository`);
}

function init(gitName, ...args) {
    const result = {
        status: 0,
        message: ""
    }
    
    const curGitPath = path.join(path.resolve(), gitName);
    if (fs.existsSync(curGitPath)){
        result.status = -1;
        result.message = `Reinitialized existing Git repository in ${curGitPath}`;
        return result;
    }
    
    fs.mkdirSync(curGitPath);
    fs.mkdirSync(path.join(curGitPath, "objects")); 
    fs.mkdirSync(path.join(curGitPath, "logs")); // 헤드나 메인 점이 어떤 명령어에 의해 바꼈는데, 어디서 어디로 바꼈는지의 로그
    fs.writeFileSync(path.join(curGitPath, "index"), "", 'utf-8'); 
    fs.mkdirSync(path.join(curGitPath, "refs", "heads"),{ recursive: true });
    fs.writeFileSync(path.join(curGitPath, "refs", "heads", "main"), "", "utf-8"); 
    
    result.message = `Initialized empty Git repository in ${curGitPath}`;
    
    return result;
};


    status() {
        if (this._localRepo){
            this._localRepo.status();
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
        return this._localRepo.printCommitLog();
    }

module.exports = git;