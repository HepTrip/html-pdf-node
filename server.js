const express = require('express');
const bodyParser = require('body-parser');
const handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/template/:template_id', async (req, res) => {
  const templateId = req.params.template_id;
  const templateData = req.body;

  try {
    const subFolder = new Date().toISOString().split('T')[0];
    const htmlFolder = path.join(__dirname, 'example', subFolder);
    const pdfFolder = path.join(__dirname, 'files', 'pdf', subFolder);
    await fs.ensureDir(htmlFolder);
    await fs.ensureDir(pdfFolder);

    const name = `golub_${uuidv4()}`;
    const basePath = path.join(__dirname, 'storage', 'app', 'public');
    const htmlFilePath = path.join(htmlFolder, name);
    const pdfFilePath = path.join(pdfFolder, `${name}.pdf`);

    await replaceVariablesAndStoreHtml(templateId, templateData, htmlFilePath, 'body');
    await replaceVariablesAndStoreHtml(templateId, templateData, htmlFilePath, 'header');
    await replaceVariablesAndStoreHtml(templateId, templateData, htmlFilePath, 'footer');

    await fs.outputFile(pdfFilePath, '');

    const command = generatePdfFromHtmlCommand(templateData, htmlFilePath);
    execCommand(command, pdfFilePath, (err, stdout, stderr) => {
      if (err) {
        console.error('Error generating PDF:', stderr);
        return res.status(500).send('Error generating PDF');
      }

      res.sendFile(pdfFilePath, (err) => {
        if (err) {
          console.error('Error sending PDF:', err);
          return res.status(500).send('Error sending PDF');
        }

        // fs.unlink(pdfFilePath, (err) => {
        //   if (err) {
        //     console.error('Error deleting PDF file:', err);
        //   }
        // });
      });
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send(`Error processing request: ${error.message}`);
  }
});

const replaceVariablesAndStoreHtml = async (templateId, data, htmlFilePath, field) => {
  const templateDir = path.join(__dirname, 'templates', templateId);
  const templateFilePath = path.join(templateDir, `${field}.html`);
  
  if (await fs.pathExists(templateFilePath)) {
    const templateContent = await fs.readFile(templateFilePath, 'utf8');
    const content = mapContent(data, templateContent);
    await fs.outputFile(`${htmlFilePath}_${field}.html`, content);
  }
};

const mapContent = (data, content) => {
  const template = handlebars.compile(content);
  return template(data);
};

const generatePdfFromHtmlCommand = (data, filename) => {
  let command = "xvfb-run -a -- wkhtmltopdf --margin-left 0 --margin-right 0 --page-size A4 ";
  command += `--margin-top 85.75 --header-spacing 1 --header-html '${filename}_header.html' `;
  command += `--footer-spacing 5 --footer-html '${filename}_footer.html' `;
  command += `${filename}_body.html `;


  return command;
};

const execCommand = (command, pdfFilePath, callback) => {
  exec(`${command} '${pdfFilePath}'`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      console.error(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    }
    callback(error, stdout, stderr);
  });
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
