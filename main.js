const { VK } = require('vk-io');

const config = require('./config.json');

const TOKEN = config.token;
const OWNER = config.owner;
const POLL = config.poll;
const SUB = config.sub;

const vk = new VK;
vk.token = TOKEN;
const fs = require('fs');

const outFilePath = 'output.txt';


main();

async function main() {
    console.log('Начало...');
    let timeStart = new Date();
    checkFile();

    let poll = await vk.api.polls.getById({
        owner_id: OWNER,
        poll_id: POLL,
    });
    printSync(`Данные опроса:
Вопрос: ${poll.question}
Количество голосов: ${poll.votes}
Анонимный: ${(poll.anonymous) ? 'да' : 'нет'}
`);

    let ansString = '';
    poll.answers.forEach(item => {
        ansString += ',' + item.id;
    }); ansString = ansString.slice(1);

    if (poll.anonymous) return;
    let answers = await vk.api.polls.getVoters({
        owner_id: OWNER,
        poll_id: POLL,
        answer_ids: ansString,
        fields: 'has_photo',
        count: 1000
    });
    console.log('Начало обработки\n');

    for (let i = 0; i < answers.length; i++) {
        let ansText = poll.answers[i].text;
        let users = answers[i].users.items;

        let answerResults = await ansRes(users);

        printSync(`
Результаты "${ansText}"
Подписанных и живых: ${answerResults.members}
Среди них
Акков без авы: ${answerResults.withoutPhoto}
Закрытых акков без авы: ${answerResults.closed}`);

        if (answerResults.allWithoutPhoto.length > 0)
            writeVKUrlSync('Аккаунты без фото:', answerResults.allWithoutPhoto);
        if (answerResults.allClosed.length > 0)
            writeVKUrlSync('Закрытые аккаунты без фото:', answerResults.allClosed);

        console.log('Результаты записаны\n');
    };

    printSync(`\nВыполнено за ${new Date() - timeStart}мс`);

    process.stdin;
}

async function ansRes(users) {
    return new Promise(async (resolve) => {
        let closed = 0, withoutPhoto = 0, members = 0;
        let allClosed = [], allWithoutPhoto = [];

        let count = 0;
        while (count <= users.length) {
            let memStr = '';

            for (let j = count; (j < count + 500) && (j < users.length); j++) {
                memStr += ',' + users[j].id;
            }
            memStr.slice(1);
            let isMems = await vk.api.groups.isMember({
                group_id: SUB,
                user_ids: memStr,
            });
            for (let j = 0; j < isMems.length; j++) {
                let isCurMem = isMems[j].member;
                // process.stdout.write(`${isCurMem}`);
                if (!isCurMem) {
                    delete users[count + j];
                }
            }

            count += 500;
        }

        users = users.filter(function (el) {
            return el != null;
        });

        for (let i = 0; i < users.length; i++) {
            const item = users[i];
            if (!item.deactivated) {
                members++;
                let a = item.is_closed;
                let b = !item.has_photo;
                closed += a && b;
                withoutPhoto += b;

                if (a && b) allClosed.push(item.id);
                if (b) allWithoutPhoto.push(item.id);
            }
        }

        resolve({
            closed: closed,
            withoutPhoto: withoutPhoto,
            members: members,
            allClosed: allClosed,
            allWithoutPhoto: allWithoutPhoto,
        });
    });
}

function checkFile() {
    fs.appendFileSync(outFilePath, '\n');
}

function printSync(text) {
    console.log(text);
    fs.writeFileSync(outFilePath, fs.readFileSync(outFilePath) + `${text}\n`)
}

function writeVKUrlSync(header, array) {
    let text = header;
    array.forEach(id => {
        text += `\nhttps://vk.com/id${id}`;
    });
    fs.writeFileSync(outFilePath, fs.readFileSync(outFilePath) + `${text}\n`, 'utf8');
}
