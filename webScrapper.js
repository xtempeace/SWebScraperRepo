//node webScrapper.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excelFileName=Worldcup.csv --dataFolder=data

let minimist=require("minimist");
let axios=require("axios");
let jsdom=require("jsdom");
let excel=require("excel4node");
let pdf=require("pdf-lib");
let fs=require("fs");
let path=require("path");


let args=minimist(process.argv);

let promise=axios.get(args.source);
promise.then(function(response){

  let html=response.data;
  let dom=new jsdom.JSDOM(html)
  let document=dom.window.document;
  let matches=[];
  let matchScoreDivs=document.querySelectorAll(".match-info.match-info-FIXTURES");
  for(let i=0;i<matchScoreDivs.length;i++)
  {
    let match={};
    let name=matchScoreDivs[i].querySelectorAll("p.name");
    match.t1=name[0].textContent;
    match.t2=name[1].textContent;

    let score=matchScoreDivs[i].querySelectorAll("span.score");
    if(score.length==2)
    {
      match.t1s=score[0].textContent;
      match.t2s=score[1].textContent;
    }
    else if(score.length==1)
    {
      match.t1s=score[0].textContent;
      match.t2s="";
    }
    else
    {
      match.t1s="";
      match.t2s="";
    }
    let desc=(matchScoreDivs[i].querySelector(".description")).textContent;
    match.result=desc;
    matches.push(match);
  }
  console.log(matches);
  let json=JSON.stringify(matches);
  fs.writeFileSync("matches.json",json,"utf-8");
  let teams=[];
  for(let i=0;i<matches.length;i++)
  {
    enterTeamName(teams,matches[i].t1);
    enterTeamName(teams,matches[i].t2);
  }
  console.log(teams);
  json=JSON.stringify(teams);
  fs.writeFileSync("preMatch.json",json,"utf-8");
  for(let i=0;i<matches.length;i++)
  {
    fillMatchesAtAppropriatePlace(matches[i].t1,matches[i].t2,matches[i].t1s,matches[i].t2s,matches[i].result,teams);
    fillMatchesAtAppropriatePlace(matches[i].t2,matches[i].t1,matches[i].t2s,matches[i].t1s,matches[i].result,teams);
  }
  json=JSON.stringify(teams);
  fs.writeFileSync("Match.json",json,"utf-8");
  prepareExcel(teams,args.excelFileName);
  makeFolderAndPdf(args.dataFolder,teams);

}).catch(function(err){
  console.log(err);
});

function makeFolderAndPdf(dataFolder,teams)
{
  if(fs.existsSync(dataFolder)==false)
  {
    fs.mkdirSync(dataFolder);
  }
  for(let i=0;i<teams.length;i++)
  {
    let pat=path.join(dataFolder,teams[i].name);
    if(fs.existsSync(pat)==false)
    {
      fs.mkdirSync(pat);
    }
    for(let j=0;j<teams[i].matches.length;j++)
    {
      //let filePath=path.join(pat,teams[i].matches[j].vs+".pdf");
      createMatchScorePdf(pat,teams[i].name,teams[i].matches[j]);
      
      

    }
  }
}

function createMatchScorePdf(teamFolderName,homeTeam,match)
{
  let matchFileName=path.join(teamFolderName,match.vs+".pdf");
  let templatFileBytes=fs.readFileSync("Template.pdf");
  let pdfDocKaPromise=pdf.PDFDocument.load(templatFileBytes);
  pdfDocKaPromise.then(function(pdfdoc)
  {
    let page=pdfdoc.getPage(0);
    page.drawText(homeTeam,{
      x:0,
      y:0,
      size:10
    });
    page.drawText(match.vs,{
      x:10,
      y:10,
      size:10
    });
    page.drawText(match.t1s,{
      x:10,
      y:20,
      size:10
    });
    page.drawText(match.t2s,{
      x:10,
      y:30,
      size:10
    });
    page.drawText(match.result,{
      x:10,
      y:40,
      size:10
    });
    let changedBytesKaPromise=pdfdoc.save();
    changedBytesKaPromise.then(function(changedBytes){
      fs.writeFileSync(matchFileName,changedBytes);
    })

  })


}

function prepareExcel(teams,excelFileName)
{
  let wb=new excel.Workbook();
  for(let i=0;i<teams.length;i++)
  {
    let ws=wb.addWorksheet(teams[i].name);
    ws.cell(1,1).string("vs");
    ws.cell(1,2).string("t1s");
    ws.cell(1,3).string("t2s");
    ws.cell(1,4).string("result");
    for(let j=0;j<teams[i].matches.length;j++)
    {
      ws.cell(j+2,1).string(teams[i].matches[j].vs);
      ws.cell(j+2,2).string(teams[i].matches[j].t1s);
      ws.cell(j+2,3).string(teams[i].matches[j].t2s);
      ws.cell(j+2,4).string(teams[i].matches[j].result);
    }

  }
  wb.write(args.excelFileName);
}

function fillMatchesAtAppropriatePlace(teamName,vs,teamScore,opponentScore,result,teams)
{

  let idx=-1;
  for(let i=0;i<teams.length;i++)
  {
    if(teams[i].name==teamName)
    {
      idx=i;break;
    }
  }
  let temp={};
  temp.vs=vs;
  temp.t1s=teamScore,
  temp.t2s=opponentScore,
  temp.result=result;
  teams[idx].matches.push(temp);


}

function enterTeamName(teams,teamName)
{
  let idx1=-1;
  for(let i=0;i<teams.length;i++)
  {
    if(teams[i].name==teamName)
    {
      idx1=i;break;
    }
  }
  if(idx1==-1)
  {
    let temp={};
    temp.name=teamName;
    temp.matches=[];
    teams.push(temp);
  }

}





