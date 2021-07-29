

class File{
    constructor({name, content, time, size, status = "Untracked"}){
        this.status = status;
        
        this.name = name;
        this.content = content;
        this.time = time;
        this.size = size;
    }
    
    getName(){
        return this.name;
    }
    getStatus(){
        return this.status;
    }
    getContent(){
        return this.content;
    }
    getTime(){
        return this.time;
    }
    getSize(){
        return this.size;
    }
    
    setStatus(status){
        this.status = status;
    }
    setSize(size){
        this.size = size;
    }
    setContent(content){
        this.content = content;
    }
    setTime(time){
        this.time = time;
    }
    
    print(){
        console.log(`${this.name}(${this.size}) : ${this.time}`);
    }
}

module.exports = File;