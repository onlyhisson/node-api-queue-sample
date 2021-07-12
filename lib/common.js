const mysql = require('mysql');
const path = require('path');
const request = require('request');
const dateTime = require('node-datetime');

require('dotenv').config({path: '/path....'});

const DB_INIT_INFO = {
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PW,
    database : process.env.DB_NAME,
    port     : process.env.DB_PORT,
}

const pool = mysql.createPool({
    ...DB_INIT_INFO,
    connectionLimit: 30
});

const getFileName = (fileName) => {
    const fileNameArr = path.basename(fileName).split('.');
    const symbol = fileNameArr[1];

    return symbol;
}

const getNodePort = (symbol) => {
    const portInfos = {
        btc: process.env.TXID_BTC_PORT,
        eth: process.env.TXID_ETH_PORT,
        tkn: process.env.TXID_TKN_PORT,
        usdt: process.env.TXID_USDT_PORT,
        dep_noti: process.env.DEPOSIT_NOTI_PORT
    };
    return portInfos[symbol];
}

const getDbConfig = () => {
    return DB_INIT_INFO;
}

const getWsEnginePort = () => {
    return {
        crypto  : process.env.WS_INIT_PORT,
        stock   : process.env.WS_STOCK_PORT,
    };
}


const getConnection = () => {
    return new Promise(function(resolve, reject){
        pool.getConnection(function (err, conn) {
            if(err) {
                reject(err);
            } else {
                resolve(conn);
            }
        });
    });
}

const exeQuery2 = (conn, qry) => {
	return new Promise(function(resolve, reject){
        conn.query(qry, function (err, results, fields) {
            if (err) {
                reject({Response: 'Failed', code: 2001});
            } else {
                resolve(results);
            }
        });
	});
};

const isJsonString = (str) => {
    try {
        JSON.parse(str);
    } catch (e) {
        console.log("e: ", e.message);
        return false;
    }
    return true;
}

const isNull = (value, replace) => {
    return value == "" 
    || value == null 
    || value == undefined 
    || (value != null && typeof value == "object" && !Object.keys(value).length) ? replace : value;
}

const getDateFormat = (mill) => {
    const date = mill ? new Date(mill) : new Date();
    const year = date.getFullYear();
    const mon = date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1;
    const dd = date.getDate() < 10 ? '0'+date.getDate() : date.getDate();
    const hour = date.getHours() < 10 ? '0'+date.getHours() : date.getHours();
    const min = date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes();
    const sec = date.getSeconds() < 10 ? '0'+date.getSeconds() : date.getSeconds();

    return `${year}-${mon}-${dd} ${hour}:${min}:${sec}`;
}

module.exports = {
    isJsonString,
    isNull,
    getDbConfig,
    getNodePort,
    getFileName,
    getConnection,
    exeQuery2,
    getDateFormat,
    getWsEnginePort
}