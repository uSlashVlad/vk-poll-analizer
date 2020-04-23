const { VK } = require('vk-io');
const { Authorization } = require('@vk-io/authorization');
const FS = require('fs');
const RL = require('readline');
require('colors');

const vk = new VK;

const DataPath = './config.json';
const DataEncoding = 'utf8';

const rl = RL.createInterface({
    input: process.stdin,
    output: process.stdout
});

let data = {
    token: undefined,
    owner: undefined,
    poll: undefined,
    sub: undefined,
};

async function main() {
    data = loadDataSync();
    if (data === '404' || data === '') {
        data = {};
        writeDataSync({});
    }

    if (!data.token) {
        let login = await readline('Введите логин: ');
        let password = await readline('Введите пароль: ');
        vk.setOptions({
            login: login,
            password: password,

            authScope: 'pages,wall,groups',
        });

        const auth = new Authorization(vk);
        const direct = auth.windowsApp();

        let response = await direct.run();

        console.log('Authorization by login completed!'.green);

        let tokenNew = String(response.token);
        tokenNew = tokenNew.slice(0, -(tokenNew.length - 6));
        console.log('Token:', tokenNew + '...');
        console.log('User ID: ' + `${response.user}`.cyan + '\n');
        vk.token = response.token;
        data.token = response.token;
    }

    let pollInput = await readline('Введите ID опроса\nВ виде -123456789_987654321: ');
    let pollInputs = pollInput.split('_');
    let own_id = undefined; let poll_id = undefined;
    if (pollInputs.length == 2) {
        own_id = Number(pollInputs[0]);
        poll_id = Number(pollInputs[1]);
    } else {
        console.log('ID опроса введено неверно. Оно будет записано как undefined'.red);
    }
    console.log();

    let subInput = await readline('Введите ID или короткое имя группы, на которую должны быть подписаны участники: ');
    let numSub = Number(subInput);
    if (numSub) subInput = numSub;

    data.owner = own_id;
    data.poll = poll_id;
    data.sub = subInput;

    writeDataSync(data);
    console.log(`${`Все данные введены. Проверьте их на правильность.
Если что-то введено неверно, перезапустите конфигурационный скрипт.`.yellow}
{
    token: ${String(data.token).cyan},
    owner: ${String(data.owner).cyan},
    poll: ${String(data.poll).cyan},
    sub: ${String(data.sub).cyan}
}`);

    process.stdin;
}


async function readline(question) {
    return new Promise((resolve) => {
        rl.question(question, answer => resolve(answer));
    });
}

function loadDataSync() {
    let exists = FS.existsSync;
    if (exists) {
        return require(DataPath);
    } else {
        FS.appendFileSync(DataPath, '{}');
        return '404';
    }
}

function writeDataSync(data) {
    let jsonContent = JSON.stringify(data);
    FS.writeFileSync(DataPath, jsonContent, DataEncoding);
}

main();