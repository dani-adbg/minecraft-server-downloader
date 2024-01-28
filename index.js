const axios = require('axios');
const inquirer = require('inquirer');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path')

function main() {
  const opts = {
    type: 'list',
    name: 'action',
    message: 'Elije una opcion',
    choices: [
      {
        name: 'Crear nuevo server',
        value: '1'
      },
      {
        name: 'Encender server',
        value: '2'
      }
    ]
  };

  inquirer.prompt(opts).then(a => {
    switch (a.action) {
      case '1':
        newServer();
        break;
      case '2':
        exServer();
        break;
      default:
        break;
    }
  }).catch(e => console.log(e));
}

function newServer() {
  const opts = {
    type: 'input',
    name: 'version',
    message: 'ingresa la versión de server que quieras descargar',
    validate: function (value) {
      if (value.length !== 0) return true;
    }
  };

  inquirer.prompt(opts).then(a => {
    if(!a.version.match(/\d+\.\d+(?:\.\d+)?/)) {
      console.error('La version debe ser en el formato X.X.X');
    } else {
      try {
        let version = `https://papermc.io/api/v2/projects/paper/versions/${a.version}/builds`;
        axios.get(version).then(async (req) => {
          const builds = req.data.builds;
          const build = builds[builds.length-1]
          version = `${version}/${build.build}/downloads/${build.downloads.application.name}`;
          const root = `server-${a.version}`;
          fs.mkdirSync(root, { recursive: true });
          const serveResponse = await axios.get(version, {
            responseType: 'stream'
          });
          const writer = fs.createWriteStream(`${root}/server.jar`, { encoding: 'utf-8' });
          fs.writeFileSync(`${root}/start.bat`, `java -Xmx6G -Xms3G -jar server.jar nogui`);
          fs.writeFileSync(`${root}/eula.txt`, 'eula=true');
          serveResponse.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          }).then(() => {
            exServer();
          })
        })
      } catch (error) {
        console.log(error);
      }
    }
  });
}

function exServer() {
  let files = [];
  fs.readdirSync("./").forEach(file => {
    if(file.match(/server-\d+\.\d+(?:\.\d+)?/)) {
      files.push(file);
    };
  })

  if(files.length === 0) {
    console.log("NO SE HAN ENCONTRADO SERVIDORES");
    setTimeout(() => {
      main();
    }, 1500)
  }

  const opts = {
    type: 'list',
    name: 'server',
    message: 'Selecciona el server que quieres encender',
    choices: files
  }

  inquirer.prompt(opts).then(a => {
    const ruta = path.join(__dirname, a.server);
    const batProcess = spawn('cmd.exe', ['/c', 'start.bat'], {cwd: ruta});

    batProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    batProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    batProcess.on('exit', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  })
}

main();