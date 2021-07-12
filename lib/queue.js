const common = require("./common.js");

// Queue의 생성자 정의
function Queue(){
    this.dataStore = [];
    this.enqueue = enqueue;
    this.dequeue = dequeue;
    this.front = front;
    this.back = back;
    this.toString = toString;
    this.empty = empty;
}

// 요소를 배열 맨 뒤에 삽입
function enqueue(element){
    this.dataStore.push(element);   
}

// 배열내의 맨 앞 요소를 반환하고 배열내에서 삭제한다.
function dequeue(){
    return this.dataStore.shift();
}

// 큐의 맨 젓번째 요소 반환
function front(){
    return this.dataStore[0];
}

//큐의 맨 끝 요소 반환
function back(){
    return this.dataStore[this.dataStore.length-1];
}

//큐에 저장된 요소 모두 출력
function toString(token){
    let tkn = token ? token : "\n";
    let retStr = "";
    for(let i=0; i<this.dataStore.length; i++) {
        if(typeof this.dataStore[i] == 'object') {
            retStr = retStr + JSON.stringify(this.dataStore[i]) + tkn;
        } else {
            retStr = retStr + this.dataStore[i] + tkn;
        }
    }
    return retStr;
}
/*
function toString(){
    let retStr = "";
    for(let i=0; i<this.dataStore.length; i++) {
        if(typeof this.dataStore[i] == 'object') {
            retStr = retStr + JSON.stringify(this.dataStore[i]) + "\n";
        } else {
            retStr = retStr + this.dataStore[i] + "\n";
        }
    }
    return retStr;
}
*/

//큐 비어있는지 확인
function empty(){
    if(this.dataStore.length == 0){
        return true;
    }
    else{
        return false;
    }
}

exports.getInstance = function () {
    return new Queue();
}