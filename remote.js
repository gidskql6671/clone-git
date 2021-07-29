const path = require('path')
const fs = require('fs');
const File = require('./file.js');


class Remote{
    constructor(dir){
        this._dir = dir;
        this._repoPath = path.join(this._dir, "objects");
        
        if (!fs.existsSync(this._dir)){
            fs.mkdirSync(this._dir);
        }
        if (!fs.existsSync(this._repoPath)){
            fs.mkdirSync(this._repoPath);
        }
        
        this._repo = this._getRepositoryFiles();
    }
    
    _getRepositoryFiles(){
        const files = fs.readdirSync(this._repoPath);
        
        return files.sort((a, b) => a - b)
                    .map(filename => {
                        const filePath = path.join(this._repoPath, filename);
                        return JSON.parse(fs.readFileSync(filePath));
                    })
    }
    
    push(commits){
        let pushedCommit = [];
        
        if (this._repo.length === 0){
            pushedCommit = commits;
        }
        else{
            pushedCommit = commits.filter(commit => this._repo[this._repo.length - 1].time < commit.time);
        }
        
        
        const version = this._repo.length;
        
        pushedCommit.forEach((commit, index) => {
            const filePath = path.join(this._repoPath, String(version + index));
            fs.writeFileSync(filePath, JSON.stringify(commit));
            
            this._repo.push(commit);
            
            console.log(`commit "${commit.message}" pushed`);
        })
        
        return true;
    }
    
    print(){
        console.log("---Remote Repository/");
        this._repo.forEach(version => {
            console.log(`commit "${version.message}"`);
            version.files.forEach(file => file.print());
            console.log("");
        });
    }
}



module.exports = Remote;