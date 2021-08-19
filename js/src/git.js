import path from 'path';
import fs from 'fs';
import 'colors';

import { makeBlob, makeTree, makeCommit } from './objects.js';
import { addFileToIndex, modifyFileInIndex, getIndexFile } from './git_index.js';


const funcMapping = {
    "init": init,
    "add": add,
    // "log": log,
    // "status": status,
    // "commit": commit
}

function git(gitName = ".mygit"){
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

function init(gitName, args) {
    const result = {
        status: 0,
        message: ""
    }
    
    const gitPath = path.join(path.resolve(), gitName);
    if (fs.existsSync(gitPath)){
        result.status = -1;
        result.message = `Reinitialized existing Git repository in ${gitPath}`;
        return result;
    }
    
    fs.mkdirSync(gitPath);
    fs.mkdirSync(path.join(gitPath, "objects"));
    fs.mkdirSync(path.join(gitPath, "logs")); // 헤드나 메인 점이 어떤 명령어에 의해 바꼈는지, 어디서 어디로 바꼈는지의 로그
    fs.mkdirSync(path.join(gitPath, "refs", "heads"),{ recursive: true });
    fs.writeFileSync(path.join(gitPath, "refs", "heads", "main"), "", "utf-8");
    fs.writeFileSync(path.join(gitPath, "HEAD"), "", 'utf-8'); // 현재 HEAD가 가리키고 있는 브렌치(커밋obj)을 나타냄
    
    result.message = `Initialized empty Git repository in ${gitPath}`;
    
    return result;
};

function add(gitName, args){
    const result = {
        status: 0,
        message: ""
    }
    
    if (!_existsGitRepo(gitName)){
        result.status = -1;
        result.message `fatal: not a git repository (or any of the parent directories): ${gitName}`;
    }
    const gitPath = _getGitRepoPath(gitName);
    
    const relativePaths = args.filter(ele => !ele.startsWith("-"));
    if (relativePaths.length === 0){
        result.status = -1;
        result.message = `Nothing specified, nothing added.\n`;
        result.message += `hint: Maybe you wanted to say 'git add .'?`.yellow;
        return result;
    }
    
    if (relativePaths.some(relativePath => !fs.existsSync(relativePath))){
        const wrongRelativePaths = relativePaths.find(ele => !fs.existsSync(ele));
        result.status = -1;
        result.message = `fatal: pathspec '${wrongRelativePaths}' did not match any files`;
        return result;
    }
    
    relativePaths.forEach(filename => {
        const content = fs.readFileSync(filename);
        
        const blobIdFromContent = makeBlob(gitPath, content);
        const indexFile = getIndexFile(gitPath);
        const blobIdFromIndex = indexFile[filename];
        
        // 새로 만든 파일(Untracked)
        if (typeof blobIdFromIndex === "undefined") {
            addFileToIndex(gitPath, filename, blobIdFromContent);
        }
        // modified
        else if (blobIdFromIndex !== blobIdFromContent){
            modifyFileInIndex(gitPath, filename, blobIdFromContent);
        }
    });
    
    return result;
}

function _existsGitRepo(gitName, curPath = path.resolve()){
    const gitPath = path.join(curPath, gitName);
    if (fs.existsSync(gitPath)){
        return true;
    }
    
    const parentPath = path.join(curPath, "..");
    if (curPath === parentPath){
        return false;
    }
    return _existsGitRepo(gitName, parentPath);
}
function _getGitRepoPath(gitName, curPath = path.resolve()){
    if (!_existsGitRepo(gitName, curPath)){
        throw new Error(`fatal: not a git repository (or any of the parent directories): ${gitName}`);
    }
    
    let nextPath = curPath;
    while(true){
        let gitPath = path.join(nextPath, gitName);
        if (fs.existsSync(gitPath)){
            return gitPath;
        }
        
        if (nextPath === path.join(nextPath, "..")){
            throw new Error(`fatal: not a git repository (or any of the parent directories): ${gitName}`);
        }
        
        nextPath = path.join(nextPath, "..");
    }
}


    // status() {
    //     if (this._localRepo){
    //         this._localRepo.status();
    //     }
    //     else{
    //         console.log("git 저장소가 없습니다.");
    //     }
    // }
    
    // // 브렌치 혹은 커밋id를 인자로 받아, 해당 위치로 checkout
    // checkout(objId){
    //     // this._localRepo.checkout(objId); 추후 구현
        
    //     return true;
    // }
    
    // commit(message){
    //     return this._localRepo.commit(message);
    // }
    // log(){
    //     return this._localRepo.printCommitLog();
    // }

export default git;