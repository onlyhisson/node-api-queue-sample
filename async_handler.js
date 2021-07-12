const express = require('express');
const app = express();
const net = require('net');
const fs = require('fs');
const CronJob = require('cron').CronJob;
const common = require("./lib/common");
const jandi = require("./lib/jandi");
const cleanup = require("./lib/cleanup");
const queueAcn = require("./lib/queue").getInstance();
//const getConnection = common.getConnection;

require('dotenv').config({path: '/path....'});

// ###################################################################################
// declare variable
// ###################################################################################
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const PORT      = process.env.ACN_API_PORT; // http 요청 받을 서버 포트
const ACN_HOST  = process.env.ACN_HOST;     // ACN 서버 아이피
const SAVE_PATH = './acn_temp.txt';         // 메모리에 남은 데이터 임시 저장 파일명
const ITEM_TKN  = "&";                      // 메모리에 남은 json형식의 문자열 데이터 구분자
const ERROR_MSG = {                         // 에러 메시지
    1000: 'Server Error',
    1001: 'Invalid Request',    // 요청한 API 에 맵핑되는 응답이 없음
    1002: 'System Error',
    1007: 'Please Check Command',
};
// Asset Change Notification, POST 요청받은 커맨드와 ip, port 정보 맵핑
const ACN_INFO = {
    asset_in    : {ip: ACN_HOST, port: 10002},   // usr_no, inout, amount(원화 혹은 달러: 암호화폐 아님)
    asset_out   : {ip: ACN_HOST, port: 10002},   // usr_no, inout, amount(원화 혹은 달러: 암호화폐 아님)
    coin_in     : {ip: ACN_HOST, port: 10003},   // symbol, usr_no, addr, amount, txid
    coin_out    : {ip: ACN_HOST, port: 10003},   // symbol, usr_no, addr, amount
    coin_add    : {ip: ACN_HOST, port: 10000},   // symbol
    coin_del    : {ip: ACN_HOST, port: 10000},   // symbol
    usr_add     : {ip: ACN_HOST, port: 10001},   // usr_no
    usr_del     : {ip: ACN_HOST, port: 10001},   // usr_no
    usr_lock    : {ip: ACN_HOST, port: 10001},   // usr_no
    usr_in      : {ip: ACN_HOST, port: 10001},   // 사용안함, HTS 에서 사용
    usr_out     : {ip: ACN_HOST, port: 10001},   // 사용안함, HTS 에서 사용
}
let notiInterval = '';      // 큐에 쌓인 acn 요청건 목록 인터벌의 변수
let statusInterval = false; // 인터벌 상태 체크
// ###################################################################################

// 프로세스 종료 캐치
cleanup.catchProccessExit(handleProccessExit);    

// ************************************************
// node 프로세스 시작
// ************************************************
startProcess();

app.use(express.json());    // body-parser 기능
app.use(express.urlencoded( {extended : false }));

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 자산(원화 혹은 달러) 입금시 ACN 엔진에 알림
 * Param    : usr_no, inout, amount
 */
 app.post('/notify/asset_in', async (req, res) => {
    try {
        const inout = 0;
        const {cmd, usr_no, amount} = req.body;
        if(!cmd || !usr_no || !amount) {    // inout 은 뺌, 커맨드에 이미 정보가 있음
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {usr_no, inout, amount};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 자산(원화 혹은 달러) 입금시 ACN 엔진에 알림
 * Param    : usr_no, inout, amount
 */
app.post('/notify/asset_out', async (req, res) => {
    try {
        const inout = 1;
        const {cmd, usr_no, amount} = req.body;
        if(!cmd || !usr_no || !amount) {    // inout 은 뺌, 커맨드에 이미 정보가 있음
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {usr_no, inout, amount};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 코인 입금시 ACN 엔진에 알림
 * Param    : cmd, symbol, usr_no, addr, amount, txid
 */
 app.post('/notify/coin_in', async (req, res) => {
    try {
        const {cmd, symbol, usr_no, addr, amount, txid} = req.body;
        if(!cmd || !symbol || !usr_no || !addr || !amount || !txid) {
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {symbol, usr_no, addr, amount, txid};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 코인 출금시 ACN 엔진에 알림
 * Param    : cmd, symbol, usr_no, addr, amount
 */
 app.post('/notify/coin_out', async (req, res) => {
    try {
        const {cmd, symbol, usr_no, addr, amount} = req.body;
        if(!cmd || !symbol || !usr_no || !addr || !amount) {
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {symbol, usr_no, addr, amount};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 코인 추가시 관리자 프로그램에서 ACN 엔진에 알림
 * Param    : cmd, symbol
 */
app.post('/notify/coin_add', async (req, res) => {
    try {
        const {cmd, symbol} = req.body;
        if(!cmd || !symbol) {
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {symbol};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 코인 삭제시 관리자 프로그램에서 ACN 엔진에 알림
 * Param    : cmd, symbol
 */
app.post('/notify/coin_del', async (req, res) => {
    try {
        const {cmd, symbol} = req.body;
        if(!cmd || !symbol) {
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {symbol};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 사용자 회원가입시 ACN 엔진에 알림
 * Param    : cmd, usr_no
 */
 app.post('/notify/usr_add', async (req, res) => {
    try {
        const {cmd, usr_no} = req.body;
        if(!cmd || !usr_no) {
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {usr_no};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 사용자 LOCK 설정(관리자) ACN 엔진에 알림
 * Param    : cmd, usr_no
 */
 app.post('/notify/usr_lock', async (req, res) => {
    try {
        const {cmd, usr_no} = req.body;
        if(!cmd || !usr_no) {
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {usr_no};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 사용자 탈퇴 ACN 엔진에 알림
 * Param    : cmd, usr_no
 */
 app.post('/notify/usr_del', async (req, res) => {
    try {
        const {cmd, usr_no} = req.body;
        if(!cmd || !usr_no) {
            throw {Response: false, code: 1001};
        }
        if(!ACN_INFO[cmd]) {
            throw {Response: false, code: 1007};
        }
        const sData = {usr_no};
        const item = getReqCmdHostInfo(cmd, sData);    // ip, port, time 정보 리턴
        queueAcn.enqueue(item); // 큐에 쌓기

        return res.json({Response: 'Succeed'});
    } catch(err) {
        errorHandler(req, res, err);
    }
});

app.post('/notify/list/all', async (req, res) => {
    try {
        console.log(queueAcn.toString());
        return res.json({Response: 'Succeed'});
    } catch(err) {
        console.log(err)
        errorHandler(req, res, err);
    }
});

app.use((req, res, next) => {
    const obj = {Response: false, code: 1001};
    errorHandler(req, res, obj)
});

// error handler
app.use(function(err, req, res, next) {
    const obj = {Response: false, code: 1002};
    errorHandler(req, res, obj);
});

app.listen(PORT, () => {
    console.log('=========== API for ACN Info ===========');
    console.log(`* DATE         : ${common.getDateFormat()}`)
    console.log(`* TIME_ZONE    : ${TIME_ZONE}`);
    console.log(`* PORT         : ${PORT}`);
    console.log(`* ACN_HOST     : ${ACN_HOST}`);
    console.log(`* SAVE_PATH    : ${SAVE_PATH}`);
    console.log('========================================');
});

// ######################################
// # 스케쥴러
// ######################################

const jobMin = new CronJob('0 * * * * *', function() { // 초, 분, 시간, 일, 달, 요일
    console.log('CronJob Time : ',common.getDateFormat());
    if(!statusInterval) {   // 인터벌 스탑이면 다시 재개
        startInterval();
    }
}, null, true, TIME_ZONE);

jobMin.start();

// ######################################
// # function
// ######################################

function errorHandler(req, res, err) {

    console.log(`query  : ${JSON.stringify(req.query)}`);
    console.log(`body   : ${JSON.stringify(req.body)}`);

    if(err)
        console.log(`ERROR  : ${JSON.stringify(err)}`);

    if(!err.Response) {
        res.json({
            Response: 'Failed', 
            code: err.code, 
            msg: ERROR_MSG[err.code]
        });
    } else {
        res.json({
            Response: 'Failed', 
            code: 1000,
            msg: ERROR_MSG[1000]
        });
    }
};

/**
 * Author   : 장형수
 * Date     : 2021-07-09
 * Content  : 큐에서 일정시간 간격으로 acn 엔진에 소캣 연결 데이터 전송 실행
 * Param    :
 */
function startInterval() {
    statusInterval = true;
    notiInterval = setInterval(()=> {
        if(!queueAcn.empty()) { // 큐 비어있는지 확인
            //console.log(queueAcn.toString());
            socketNotifyEngine(queueAcn.dequeue());
        }
    }, 0)
}

/**
 * Author   : 장형수
 * Date     : 2021-07-09
 * Content  : 큐에서 일정시간 간격으로 acn 엔진에 소캣 연결 데이터 전송 정지
 * Param    :
 */
 function stopInterval() {
    statusInterval = false; // ACN 서버 통신 에러시 인터벌 스탑
    clearInterval(notiInterval);
}

/**
 * Author   : 장형수
 * Date     : 2021-07-09
 * Content  : 자산변화, 회원 상태에 변화에 따라 acn 엔진에 데이터 전송
 * Param    : 엔진에 전송할 데이터 정보
 */
function socketNotifyEngine(item) {
    stopInterval();

    console.log("# +++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log(`# Notify to Engine Data : ${JSON.stringify(item)}`);
    console.log("# +++++++++++++++++++++++++++++++++++++++++++++++++++++");

    const client = new net.Socket();

    const host = item.host;
    const port = item.port;

    const s_data = {
        cmd: item.cmd,
        data: item.data
    }
    
    try {
        client.connect(port, host, function() {
            console.info(`[EVENT CONNECT]  : Connected`)
            client.write(JSON.stringify(s_data));
            startInterval();
        });
        
        client.on('data', function(data) {
            console.info(`[EVENT DATA] Received : ${data}`)
            client.destroy(); // kill client after server's response
            startInterval();
        });
        
        client.on('close', function() {
            console.info('Connection closed');
            startInterval();
        });

        client.on('error', function(err) {
            const msg = `[EVENT ERROR]  : ${err}`;
            console.err(msg);
            throw {cmsg : msg}
         })
    } catch(err) {
        const msg = err.cmsg ? err.cmsg : `SOCKET ERROR : ${JSON.stringify(err)}`;
        console.log(msg);

        queueAcn.enqueue(item);

        const nItem = item;
        nItem.msg = msg;
        jandi.sendAcnErrorInfo(nItem);
    }
    
}

/**
 * Author   : 장형수
 * Date     : 2021-07-09
 * Content  : 프로세스 종료 및 재시작시 큐에 데이터가 남아 있을 경우 파일 저장
 * Param    : 엔진에 전송할 데이터 정보
 */
function handleProccessExit() {
    const data = queueAcn.toString(ITEM_TKN);

    console.log('# Handle Proccess Exit');
    console.log(`# Save Path  : ${SAVE_PATH}`);
    console.log(`# Save Data  : ${data}`);

    fs.writeFileSync(SAVE_PATH, data, function(err) {   // writeFile -> writeFileSync 로 처리해야함
        if(err) {
            console.log(err)
        }
    });
}

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 프로세스 시작 함수
 * Param    : 
 */
function startProcess() {

    console.log('########################################');
    console.log('#');
    console.log('# Process Started..');
    console.log('#');
    console.log('########################################');

    // 메모리 데이터를 임시 저장한 파일의 데이터 다시 큐에 쌓기
    fs.readFile(SAVE_PATH, 'utf8', function (err, data) {
        if(data) {
            const strData = data.split(ITEM_TKN).filter(el => el != '')
            strData.forEach(el => queueAcn.enqueue(JSON.parse(el)));
            console.log("# ------------------------------------------------------------");
            console.log('# 임시 저장 파일 데이터 => 큐 저장 [ Succeed ]');
            console.log(queueAcn.toString());
            console.log("# ------------------------------------------------------------");
            deleteTempFile(SAVE_PATH);
        } else {
            console.log('파일 저장된 데이터 없음');
            deleteTempFile(SAVE_PATH);
        }
        startInterval();
    });
}

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 프로세스 종료시 메모리 데이터 저장 파일 삭제
 * Param    : 파일명 (상대 경로)
 */
function deleteTempFile(filePath) {
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) return console.log(`FILE ACCESS FAILED : ${filePath}`);
      
        fs.unlink(filePath, (err) => {
            if(err)
                console.log(`FILE DELETE FAILED : ${err}`)
            console.log(`FILE DELETE SUCCEED : ${filePath}`);
        });
    });
}

/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : 각 요청 커맨드 맵핑 호스트 정보 리턴
 * Param    : command
 */

 function getReqCmdHostInfo(cmd, sData) {
    const host  = ACN_INFO[cmd].ip;
    const port  = ACN_INFO[cmd].port;
    const now   = (new Date).getTime();
    const ftime = common.getDateFormat(now);

    const item  = {
        host,
        port,
        time: now,
        ftime,
        cmd,
        data : sData
    }
    return item;
 }