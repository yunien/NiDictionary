const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require("fs");
const forEach = require('async-foreach').forEach;

const app = express();

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// init 建立base檔案
setTimeout(function() {
  createFile('base');
}, 1000);

const PUBLIC_PATH = './public/';

const readFile = (fileName) => {
  const filePath = PUBLIC_PATH + fileName + '.json';
  if(fs.existsSync(filePath)){
    const jsonString = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(jsonString);
  }else{
    console.log(filePath, ' 檔案不存在。');
  }
};

const writeFile = async (fileName, nweEnString) => {
  const filePath = PUBLIC_PATH + fileName + '.json';
  console.log('filePath:', filePath);
  if(fs.existsSync(filePath)){
    await fs.writeFileSync(filePath, nweEnString);
  }else{
    console.log(filePath, ' 檔案不存在。');
  }
};

const createFile = async (newFileName) => {
  const newFlie = PUBLIC_PATH + newFileName + '.json';
  console.log('newFlie:', newFlie);
  if(fs.existsSync(newFlie)){
    console.log('檔案存在，不重複創建。');
  }else{
    await fs.writeFileSync(newFlie, '{}');
  }
};

const findDatas = async (fileJson) => {
  let array = [];
  forEach(Object.keys(fileJson), (item, index, arr) => {
    const datas = {key: item, value: fileJson[item]}
    array.push(datas);
  });
  return array;
};

app.get('/findData/:fileName', async (req, res) => {
  const fileName = req.params.fileName;
  const fileJson = await readFile(fileName);
  const datas = await findDatas(fileJson);
  res.send({catalogs: datas});
});

const findREaddir = () => new Promise((rs, rj) => {
  fs.readdir('./public', (err, files) => {
    if (err) {
      console.log(err);
      return;
    }
    let fileArray = [];
    forEach(files, (item) => {
      if(item !== 'index.html'){
        const name = item.split('.');
        fileArray.push(name[0]);
      }
    });
    rs(fileArray);
  });
});

app.get('/getFileName', async (req, res) => {
  findREaddir().then(result => {
    res.send({files: result});
  }).catch(err => {throw err});
});

app.post('/add/:fileName', async (req, res) => {
  const fileName = req.params.fileName;
  
  const enJson = await readFile(fileName);
  
  const data = {[`${req.body.twData}`]: req.body.cnData};

  Object.assign(enJson, data);
  const nweEnString = JSON.stringify(enJson);
  await writeFile(fileName, nweEnString);

  //  有變數，自動創建檔案，檔案名：變數名稱
  let resultValue = '';
  const splitContexts = req.body.twData.split('$');
  if(splitContexts.length > 1){ //有變數
    forEach(splitContexts, (item, index, arr) => {
      const start = item.indexOf('{');
        const end = item.indexOf('}', start+1);
        const key = item.substring(start+1, end);
        if (key !== ''){
          createFile(key);
        }
      });
  }
  res.status(200).send({twData: req.body.twData, cnData: req.body.cnData});
});

app.post('/remove/:fileName', async (req, res) => {
  const fileName = req.params.fileName;
  console.log('remove');
  const enJson = await readFile(fileName);
  const twData = req.body.twData;
  
  delete enJson[twData];

  const nweEnString = JSON.stringify(enJson);
  await writeFile(fileName, nweEnString);

  res.status(200).send({twData: req.body.twData});
});

const getVariable = (element) => {
  const start = element.indexOf('{');
  const end = element.indexOf('}', start+1);
  const key = element.substring(start+1, end);
  return key;
};

app.post('/conveter', async (req, res) => {
  const {fileName, textKey, textBody} = req.body;
  const textKeyArr = textKey.split('$');
  const textBodyArr = textBody.split('$');
  let mappingArr = textKeyArr.map((d, i) => {
    if(i > 0) {
      const fName = getVariable(textKeyArr[i]);
      const fKey = getVariable(textBodyArr[i]);
      return {fName, fKey};
    } else {
      return {fName: 'base', fKey: textKey};
    }
  });

  const baseJson = readFile(fileName);
  const firstValue = baseJson[textKey];
  const firstValueArr = firstValue.split('$');
  const resultArr = firstValueArr.map((d, i) => {
    if (i === 0) {
      return d;
    } else {
      const secondFileName = getVariable(d);
      const json = readFile(secondFileName);
      const mappingObj = mappingArr.find(d => d.fName === secondFileName);
      const secondValue = json[mappingObj.fKey];
      if(secondValue === undefined){
        return d.replace('{'+secondFileName+'}', 'OOO');
      }else{
        return d.replace('{'+secondFileName+'}', secondValue);
      }
    }
  });
  
  let result = '';
  resultArr.forEach(item => {
    result = result + item;
  });

  res.send({value: result});  
});

process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error);
  process.exit(1) // To exit with a 'failure' code
});

app.listen(2095, () => console.log('Website：http://localhost:2095/'))
