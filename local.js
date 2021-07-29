const path = require('path')
const fs = require('fs');
const File = require('./file.js');
const Remote = require('./remote.js');
const { time } = require('console');


class Local{
    constructor(dir, name){
        this._name = name;
        this._dir = path.join(dir, name);
        this._repoPath = path.join(this._dir, ".git", "objects");
        this._logPath = path.join(this._dir, ".git", "logs");
        this._remoteDir = path.join(this._dir, ".remote");
        
        this._files = this._getWorkingDirFiles();
        this._index = [];
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
        file.setStatus("Modified");
        file.print();
        
        return true;
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