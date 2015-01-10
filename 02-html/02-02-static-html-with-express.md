Static HTML in Express
====

With express it is easy to create static web sites. Static sites are those whose html pages do not change. They don't require access to a database or deliver custom content that depends on a user logging in. Web application development begins with a solid understanding of static html.

Be sure you are familiar with the command line, git and html before working through this chapter.

## Resources

[Express](http://expressjs.com/): It is after all the web framework we're using.

## Create a new express application

Create a new directory for the project where all the express application code will reside and `cd` into it so that it is now the working directory:

	$ mkdir static-express
	$ cd static-express

Generate an express application with the `express` command and install the application's dependencies:

	$ express
	$ npm install
	
Confirm the application is working:

	$ npm start

View it in a web browser at:

	http://localhost:3000/

Recall that you can terminate the application by typing Control-C (^C) into the terminal window (hold down the *control* key and press the *C* key.):

	$ ^C

## Initialize a git repository

Before modifying the application, commit the project to a new git repository. Ensure you are in the *static-express* directory that contains the project's files then initialize the repository, add the project's files to the repository and commit the files:

	$ git init
	$ git add .
	$ git commit -m "initial commit"

Recall that `git add .` uses the `.` alias to recursively add all the files and subfolders to the repository and that a commit requires a commit message which is given with the `-m` flag.


## Prep and push to heroku

It is a common practice to regularly deploy changes to a web application. Unlike desktop or mobile applications which must be downloaded for users to see changes, web applications reside at a singlely accessed location, often  a single web server, which allows developers to make changes immediately available.

Normally changes are first deployed to a *pre-production* environment where they are tested. Pre-production acts as an intermediary between a *local* machine like your laptop and the actual *production* environment, such as heroku. Imagine having another heroku server to test all your code on but which you do not let the public access.

We'll skip the pre-production step and deploy directly to a public heroku server. Recall the three steps required: 1. set up a Procfile for heroku, 2. create the heroku app, and 3. push the application to heroku's servers with git.

Ensure you are in the project's main folder, also known as its *root* directory, and create the Procfile and heroku app:

	$ touch Procfile
	$ echo "web: node ./bin/www" >> Procfile
	$ heroku create
	
Add the new Procfile to the git repository. Any time you make changes to your application, you must commit them in the repository before uploading them to heroku:

	$ git add Procfile
	$ git commit -m "added heroku procfile"
	
Upload the changes to heroku and view them:

	$ git push heroku master
	$ heroku open
 
 

## Static html

Express includes support for *static* html, or html that does not change depending on the brower's request for it. Static html resides in the application's *public* directory. With the help of a *middleware* plugin, express looks in that public directory when a file is requested from the server and, if it finds it, delivers the file without executing any more application code.

Confirm that the express application includes a public directory:

	$ ls -al
	total 16
	drwxr-xr-x  10 okcoders  staff   340 Jun  4 11:45 .
	drwxr-xr-x   5 okcoders  staff   170 Jun  4 11:44 ..
	drwxr-xr-x  13 okcoders  staff   442 Jun  4 11:45 .git
	-rw-r--r--   1 okcoders  staff  1376 Jun  4 11:44 app.js
	drwxr-xr-x   3 okcoders  staff   102 Jun  4 11:44 bin
	drwxr-xr-x  10 okcoders  staff   340 Jun  4 11:45 node_modules
	-rw-r--r--   1 okcoders  staff   331 Jun  4 11:44 package.json
	drwxr-xr-x   5 okcoders  staff   170 Jun  4 11:44 public
	drwxr-xr-x   4 okcoders  staff   136 Jun  4 11:44 routes
	drwxr-xr-x   5 okcoders  staff   170 Jun  4 11:44 views
	
The public directory itself contains a few other directories:

	$ ls -al public/
	total 0
	drwxr-xr-x   5 okcoders  staff  170 Jun  4 11:44 .
	drwxr-xr-x  10 okcoders  staff  340 Jun  4 11:45 ..
	drwxr-xr-x   2 okcoders  staff   68 Jun  4 11:44 images
	drwxr-xr-x   2 okcoders  staff   68 Jun  4 11:44 javascripts
	drwxr-xr-x   3 okcoders  staff  102 Jun  4 11:44 stylesheets
	
Express has provided folders for additional *assets* such as images, javascript files and css stylesheets, but you may organize your html and other static files however you like. 

A web page on a public server is identified by a url, or *uniform resource locator*. The url includes information such as the protocol being used, the server, and the file being requested. For example, the url http://www.google.com/about.html uses the http protocol (or *hypertext transfer protocol*), identifies www.google.com as the server, and requests the about.html page:

	URL : http://www.google.com/about.html
	
	protocol : http
	server   : www.google.com
	file     : about.html

When a file is not explicitly named, a web server implicitly returns the *index.html* file. For example, visiting http://google.com without a specific file like about.html results in Google's servers responding with index.html or whatever other behavior is defined for the index.html page.

Right now express is responding to the implicit request for index.html with application code rather than a static web page. Create an index.html file in the public directory and add content to it.

Recall that touch creates a new empty file if one does not already exist:

	$ touch public/index.html
	
Add the following content to it:

	<!DOCTYPE html>
	<html>
		<head>
			<title>Homepage</title>
		</head>
		
		<body>
			<h3>Homepage</h3>
			<p>Welcome to my homepage</p>
		</body>
	</html>
	
If the express application is not currently running, start it:

	npm start
	
View it in the browser at both urls:

	http://localhost:3000/
	http://localhost:3000/index.html
	
Express is now serving up the public/index.html page implictly and explicity for requests to index.html.

Note that it is not necessary to include 'public' in the url, such as http://localhost:3000/public/index.html. Code in the  application ensures that express looks in the public directory without it being included in the url. The *public* directory is consequently known as the *root* directory for static content, and it is not possible to access static content outside it.

## Commit the changes and upload them to heroku

You've made changes to the application, so it's time to deploy again. Add any new files you created to the git repository, either by name or using the `.` shortcut, commit them with a commit message, and push them to heroku:

	$ git add public/index.html
	$ git commit -m "added static index page"
	$ git push heroku master

Confirm your changes on heroku:
	
	$ heroku open
	
Continue to modify the application by adding content to the public directory. Try adding a profile.html page with information about you. Include links to your social media pages if you have any or some of your favorite sites, and include a picture (it doesn't have to be of you).

Every time you make changes to the application, confirm those changes locally by visiting the page at the localhost address, add the changes to the git repository and commit them, and push them to heroku. Finaly, always confirm that the changes appear on the public server.
