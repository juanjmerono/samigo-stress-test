import { group, sleep, check } from 'k6';
import http from 'k6/http';
import { loadUsers } from './users.js';
import { loadConfig } from './config.js';

export let configValues = loadConfig();
export let users = loadUsers();

export let options = {
	// Use this two lines to run single loops
	vus: Math.min(configValues.userCount,users.length), // Avoid use more users than available
	iterations: Math.min(configValues.userCount,users.length)*configValues.userLoops,
	maxRedirects: 2,
	// Use stages to run for a long time
    /*stages: [
		{ duration: "1m", target: Math.min(configValues.userCount,users.length) },
		{ duration: "28m", target: Math.min(configValues.userCount,users.length) },
		{ duration: "1m", target: 0 },
    ]*/	
};

export let showDebug = (res,extraData) => {
	if (res) sleep(0.5);
	if (configValues.logLevel!='none') {
		if (res && configValues.logLevel==='debug') console.log('['+(__VU-1)+']['+users[__VU-1]+']['+res.request.method+']['+res.request.url+']['+res.status+']['+res.body.length+']');
		//if (res && configValues.logLevel==='debug' && res.request.body) console.log('['+(__VU-1)+']['+users[__VU-1]+'][BODY: '+res.request.body+']');
		if (extraData) console.log('['+(__VU-1)+']['+users[__VU-1]+']['+extraData+']');
	}
}

export let testFiles = [
	{
		file: open("./image.png", "b"),
		name: 'image.png',
		bytes: '15,15 KB',
		contentType: 'image/png',
	},
	{
		file: open("./text.txt"),
		name: 'file.txt',
		bytes: '0,51 KB',
		contentType: 'text/plain',
	}];

export let createAnswer = (res,firstOrLast,isFile) => {
	let answer = {};
	let radionButton = firstOrLast ? res.html().find('input[type=radio]').first() : res.html().find('input[type=radio]').last();
	answer[radionButton.attr('name')] = radionButton.attr('value');
	return answer;
}

export let submitFile = (res,question,isFile,firstOrLast) => {
	let newRes = res;
	let answer = {};
	let testFile = firstOrLast?testFiles[0]:testFiles[1];
	if (isFile) {
		answer[isFile] = http.file(testFile.file,testFile.name,testFile.contentType);
		newRes = res.submitForm({
			formSelector: 'form[id="takeAssessmentForm"]',
			fields: answer,
			submitSelector: 'input[id*="deliverFileUpload"]'
		});
		showDebug(newRes);
		let checkRes = check(newRes, {
			'upload': r => r.status === 200
							&& r.body.indexOf(testFile.name)>0 
							&& r.body.indexOf('('+testFile.bytes+')')>0
							&& r.body.indexOf('Preguntas '+(question - 1)+' de')>0
			/*  'upload200': r => r.status === 200,
			  'upload-file': r => r.body.indexOf(testFile.name)>0,
			  'upload-bytes': r => r.body.indexOf('('+testFile.bytes+')')>0,
			  'upload-question': r => r.body.indexOf('Preguntas '+(question - 1)+' de')>0*/
		});
		
	}
	return newRes;
}

export let assessmentSelected = 'selectIndexForm:selectTable:'+configValues.selectedIndex+':takeAssessment';

export let checkPresence = () => {
	let pres = http.get(configValues.baseUrl+"/portal/presence/"+configValues.siteId+"?output_fragment=yes&auto=true&_="+(new Date()).getTime());
	let pcheckRes = check(pres, {
		'presence': r => r.status === 200 && r.body.indexOf('update')>0,
	});
	showDebug(pres);	
}

export default function() {

	group("Portal", function() {
		let res = http.get(configValues.baseUrl+"/portal");
		showDebug(res);
		const checkRes = check(res, {
			'portal': r => r.status === 200 && r.body.indexOf('Sakai : Gateway : Welcome')>0,
		});
	});

	group("XLogin", function() {
		let res = http.get(configValues.baseUrl+"/portal/xlogin");
		showDebug(res);
		let checkRes = check(res, {
			'xlogin': r => r.status === 200 && r.body.indexOf('xlogin')>0,
		});
		res = res.submitForm({
			formSelector: 'form[id="Mrphs-xlogin"]',
			fields: { eid: configValues.rootUser, pw: configValues.rootPasswd }
		});
		showDebug(res);
		checkRes = check(res, {
			'portal': r => r.status === 200 && r.body.indexOf('"eid": "'+configValues.rootUser+'"')>0,
		});
	});

	group("BecomeUser", function() {
		let res = http.get(configValues.baseUrl+"/portal/site/!admin/tool/!admin-1110/main");
		showDebug(res);
		let checkRes = check(res, {
			'tool': r => r.status === 200 && r.body.indexOf('su:become')>0,
		});
		res = res.submitForm({
			formSelector: 'form[id="su"]',
			fields: { "su:username": users[__VU-1] }
		});
		showDebug(res);
		checkRes = check(res, {
			'portal': r => r.status === 200 && r.body.indexOf('"eid": "'+users[__VU-1]+'"')>0,
		});

	});	
	
	group("GoSiteSamigo", function() {
		// Find User Site
		configValues.sites.forEach(sId => {
			let resSite = http.get(configValues.baseUrl+"/direct/site/"+sId+"/pages.json");
			showDebug(resSite);
			if (resSite.status==200) {
				// Get Site Id
				configValues.siteId = sId;
				let rbody = JSON.parse(resSite.body);
				rbody.forEach(p => {
					// Get Samigo Tool Id
					if (p.tools.length==1 && p.tools[0].toolId == 'sakai.samigo') {
						configValues.toolId = p.tools[0].placementId;
						showDebug(null,'SITEID: '+configValues.siteId+' TOOLID: '+configValues.toolId);
					}
				});
			}
		});
		let res = http.get(configValues.baseUrl+"/portal/site/"+configValues.siteId);
		showDebug(res);
		let checkRes = check(res, {
			'site': r => r.status === 200 && r.body.indexOf('"siteId": "'+configValues.siteId+'"')>0,
		});
		checkPresence();
		// Find Samigo Tool in this Site
		//let urlSplit = res.html().find("a.Mrphs-toolsNav__menuitem--link").has('span.icon-sakai--sakai-samigo').attr('href').split('/');
		//configValues.toolId = urlSplit[urlSplit.length-1];
		res = http.get(configValues.baseUrl+"/portal/site/"+configValues.siteId+"/tool/"+configValues.toolId);
		showDebug(res);
		checkRes = check(res, {
			'tool': r => r.status === 200 && r.body.indexOf('SUBMITTED ASSESMENTS')>0,
		});
		// Wait for the index assessment
		let assessmentClick = res.html().find('a[id="'+assessmentSelected+'"]').attr('onclick');
		while (!assessmentClick) {
			res = http.get(configValues.baseUrl+"/portal/site/"+configValues.siteId+"/tool/"+configValues.toolId);
			showDebug(res);
			checkRes = check(res, {
				'tool': r => r.status === 200 && r.body.indexOf('SUBMITTED ASSESMENTS')>0,
			});
			assessmentClick = res.html().find('a[id="'+assessmentSelected+'"]').attr('onclick');
		}
		configValues.assessmentId = assessmentClick.split(',')[2].split(':')[1].replace('\'','').replace('\'','');
		showDebug(res,'ASSESSMENTID: '+configValues.assessmentId);
		checkPresence();
	});	
	
	group("TakeAssessment", function() {
		let res = http.get(configValues.baseUrl+"/portal/site/"+configValues.siteId+"/tool/"+configValues.toolId);
		showDebug(res);
		let checkRes = check(res, {
			'toolWithAssessment': r => r.status === 200 && r.body.indexOf(assessmentSelected)>0,
		});
		let dynamicFields = {
			publishedId: configValues.assessmentId, 
			actionString: 'takeAssessment'
		};
		dynamicFields[assessmentSelected] = assessmentSelected;
		// Select Assessment
		res = res.submitForm({
			formSelector: 'form[id="selectIndexForm"]',
			fields: dynamicFields
		});
		showDebug(res);
		checkRes = check(res, {
			'selectAssessment': r => r.status === 200 && r.body.indexOf('takeAssessmentForm')>0 && r.body.indexOf('ASSESSMENT INTRODUCTION')>0,
		});
		checkPresence();
		// Begin Assessment
		res = res.submitForm({
			formSelector: 'form[id="takeAssessmentForm"]'
		});
		showDebug(res);
		checkRes = check(res, {
			'beginAssessment': r => r.status === 200 && r.body.indexOf('Preguntas 1 de')>0,
		});
		let question = 2;
		let noSubmitForGrade = res.body.indexOf('takeAssessmentForm:submitForGrade')<0;
		let isFile = res.html().find('input[type=file]').attr('name');
		let firstOrLast = Math.random() >= 0.5;
		while (noSubmitForGrade) {
			// Always answer first/last option randomly
			// Next question
			res = submitFile(res,question,isFile,firstOrLast).submitForm({
				formSelector: 'form[id="takeAssessmentForm"]',
				fields: createAnswer(res,firstOrLast),
				submitSelector: 'input[id="takeAssessmentForm:next"]'
			});
			showDebug(res,'Question: '+(question-1)+' Answer: '+ (isFile?(firstOrLast?'Binary':'Text')+' File':(firstOrLast ? 'A':'Z')));
			checkRes = check(res, {
				'nextQuestion': r => r.status === 200 && r.body.indexOf('Preguntas '+question+' de')>0,
			});
			question++; firstOrLast = Math.random() >= 0.5;
			noSubmitForGrade = res.body.indexOf('takeAssessmentForm:submitForGrade')<0;
			isFile = res.html().find('input[type=file]').attr('name');
			if (question % 2 == 0) checkPresence();
		}
		// Submit for grade
		res = submitFile(res,question,isFile,firstOrLast).submitForm({
			formSelector: 'form[id="takeAssessmentForm"]',
			fields: createAnswer(res,firstOrLast),
			submitSelector: 'input[id="takeAssessmentForm:submitForGrade"]'
		});
		showDebug(res, 'LastQuestion: '+(question-1)+' Answer: '+ (isFile?(firstOrLast?'Binary':'Text')+' File':(firstOrLast ? 'A':'Z')));
		checkRes = check(res, {
			'submitForGrade': r => r.status === 200 && r.body.indexOf('takeAssessmentForm:previous')>0,
		});

		if (configValues.submitForGrade) {
			// Confirm submit
			res = res.submitForm({
				formSelector: 'form[id="takeAssessmentForm"]',
				submitSelector: 'input[id="takeAssessmentForm:submitForGrade"]'
			});
			showDebug(res, 'Confirm submit');
			checkRes = check(res, {
				'confirmSubmit': r => r.status === 200 && r.body.indexOf('submittedForm')>0,
			});
			// The Samigo Form is not well formed
			let sName = res.html().find('input[type=submit]').attr('name');
			let sValue = res.html().find('input[type=submit]').attr('value');
			let viewState = res.html().find('input[name="javax.faces.ViewState"]').attr('value');
			let myFields = {
				'javax.faces.ViewState': viewState
			};
			myFields[sName] = sValue;
			// Back to list
			res = res.submitForm({
				formSelector: 'form[id="submittedForm"]',
				fields: myFields
			});
			showDebug(res);
			checkRes = check(res, {
				'continue': r => r.status === 200 && r.body.indexOf('SUBMITTED ASSESMENTS')>0 && r.body.indexOf(assessmentSelected)>0,
			});
		}
		checkPresence();
	});	
	
	group("Logout", function() {
		let res = http.get(configValues.baseUrl+"/portal/logout");
		showDebug(res);
		let checkRes = check(res, {
			'rootPortal': r => r.status === 200 && r.body.indexOf(configValues.rootUser)>0,
		});
		// Avoid hit CAS server (no redirects)
		res = http.get(configValues.baseUrl+"/portal/logout",{redirects:0});
		showDebug(res);
		checkRes = check(res, {
			'logout': r => r.status === 302 && r.headers['Location'].endsWith('/cas/logout?service='+configValues.baseUrl+'/portal'),
		});
		// Check is in main portal
		res = http.get(configValues.baseUrl+"/portal");
		showDebug(res);
		checkRes = check(res, {
			'portal': r => r.status === 200 && r.body.indexOf('Sakai : Gateway : Welcome')>0,
		});		
		// Random sleep between 20s and 40s
		// sleep(Math.floor(Math.random()*20+20));
	});	

}
