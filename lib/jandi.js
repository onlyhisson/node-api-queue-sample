// JANDI Webhook Api functions
const request = require('request');
const common = require("./common.js");
const getConnection = common.getConnection;

require('dotenv').config({path: '/path....'});

const web_hook_urls = {
    test            : process.env.JANDI_TEST_URL,       // 웹훅 테스트 
    exchange_coin   : process.env.JANDI_EX_COIN_URL,    // 코인 전환 로그
    error           : process.env.JANDI_ERR_URL,        // 실시간 오류 알림
};


/**
 * Author   : 장형수
 * Date     : 2021-07-12
 * Content  : ANC 서버 통신 에러
 * Param    : 엔진에 전송할 데이터 정보
 */
 const sendAcnErrorInfo = async (params) => {

    // "host":"52.24.148.247","port":7000,"cmd":"coin_add","code":1,"usrNo":4,"time":1626067271395,"ftime":"2021-07-12 05:21:11"
    const {host, port, cmd, code, usrNo, time, ftime, msg} = params;
    const title = 'ACN SOCKET ERROR'

    const content = `
        HOST\t\t: ${host}
        PORT\t\t: ${port}
        CMD\t\t: ${cmd}
        CODE\t\t: ${code}
        USER_NO\t: ${usrNo}
        TIME\t\t: ${time}
        FTIME\t\t: ${ftime}
        MESSAGE\t: ${msg}
    `;

    // 전체 잔디 웹훅 data body
    const data_body = {
        "body": `[${title}]`,
        "connectColor": "#FF0000",
        "connectInfo": [
            {
                "title": `${title}`, // 이메일 전송 타입
                "description": content
            },
        ]
    };

    try {
        request.post({
            headers: { "Accept": "application/vnd.tosslab.jandi-v2+json", "Content-Type": "application/json" },
            url: web_hook_urls['error'],    // 실시간 오류 알림
            body: data_body,
            json: true
        }, function (error, response, body) {
            if(error) {
                console.log('error : ', error);
                throw {msg: 'request error'};
            }
            if(response.statusCode != 200) {
                throw {msg: 'request failed'};
            }

            console.log({msg: 'success'})
        })
    } catch (error) {
        console.log(error);
    }
};

// ########################################################################
// function 
// ########################################################################


module.exports = {
    sendAcnErrorInfo
}