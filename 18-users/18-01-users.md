Managing Users
======================================

Our applications has a problem right now. Any visitor to the site can create, edit or delete a post, and this problably isn't what we want. Instead we'd like to be able to exercise control over posts and comments. Ultimately we want to control acces to the database, and specifically to editing the database. We want to control who can create posts or edit them and who can create comments or edit them.

But access to the database is not direct. No one logs into the database except for us from the command line. Instead access to the database occurs through the web site, through particular pages on the website such as the GET, PUT and POST routes associated with creating and editing posts and comments.

*Controlling access to the database from the perspective of a web application means controlling access to particular urls.*

We'll control access to routes in our application by assigning different levels of access to our visitors. Most visitors will have read only access. Other visitors will have the ability to create comments and edit their own comments. Finally, administrators will have the ability to create, edit or delete any posts or comments.

We'll then need a way to track what level of access a particular visitor has. We'll need the ability to identify a visitor as an administrator or as a regular user who can comment on posts. This is not trivial. We'll need to store user data, support user log in, track users across multiple http requests and restrict access based on a user's privileges.

We'll begin with modeling those visitors with more than read only access as users. We'll then povide a way for users to sign up, log in and log out. Finally we'll actually control access to particular parts of the site based on whether a visitor is signed in as a user and whether she is an administrator.

## References

[Access Control](http://en.wikipedia.org/wiki/Information_security#Access_control)

Wikipedia's entry on access control for information security.

[Form based authentication](http://stackoverflow.com/questions/549/the-definitive-guide-to-form-based-website-authentication)

Stack overflow summary of the issues that must be addressed when handling web based user authentication.

[bcrypt](https://github.com/ncb000gt/node.bcrypt.js)

The module we'll use for encrypting passwords.

[Password Salting](http://en.wikipedia.org/wiki/Salt_(cryptography))

Salting passwords with a random addition to the user provided password results in a more secure encryption that produces unique results even when the same password is used by more than one user.

## Handling Users

Adding users to a site involves a number of moving parts and a great many paths that must be mapped out and planned before being implemented. Questions that need to be addressed include:

- What kind of users do we want and with what kind of access restrictions (adminstrators, commenters, etc)?
- What routes are needed to support users (login, logout, profiles, etc...)
- Where should links to the routes appear on the existing site?
- What does the sign up process look like? Do we have usernames or just email addresses. How do we validate email addresses and passwords (length, actual email address, etc)
- Do we verify email addresses? How?
- How do we handle a user who has forgotten their password?
- Do we let users change their passwords?
- What does the user model look like? And so what information appears on a user's profile?
- How do we securely store user passwords in a database and ensure that passwords are communicated security from the browser to our server?
- How do we handle redirection? Where do we take a user after they log in and after they log out?
- How do we manage user tracking across multiple browser requests?

We'll address a subset of these questions in this lesson. We'll implement a basic user model with database support along with the routes and views that support signing in and logging out with working authentication.

This work will establish the foundation for the more difficult task of tracking a user across multiple http requests using cookies and sessions so that we can control access to parts of the site. We'll implement that in the next lesson.

## Modeling Users

Our user model is the most straightforward part of user management. Our model will store a user's email address and password, which they will use to log into the site. It will also store a boolean variable to track administrators.

Add the file `models/user.js` to your project and provide the following schema and model definition:

```js
var mongoose = require('mongoose');

var schema = mongoose.Schema({
  email: {type: String, require: true, trim: true, unique: true},
  password: {type: String, require: true},
  admin: {type: Boolean, default: false}
});

var User = mongoose.model('users', schema);
module.exports = User;
```

This should all look familiar with the exception of the `unique: true` option for the email address. This extra code ensures that mongoose raises an error if we try to create a new user with the same email address as a user already in the database.

With a schema as basic as this we could implement sign up and log in, but we would be storing passwords as *plain text* in the database, and this is a no-no.

## Encrypting a User's Password

We will never store plain text passwords in the database. But a user always submits a plain text password when they first sign up and they will submit a plain text password when they log in later. How do we store an encrypted version of the password at sign up so that we can compare the plain text version to it at log in when we cannot decrypt the encrypted password?

**The strategy**

We'll create a new user when someone signs up to the site. At that point we have a plain text password that should be encrypted before being saved to the database. Then when a user logs in they'll provide a plain text password again. We will encrypt the submitted password using the same procedure that was used when the user was first created and compare the result to the encrypted version stored in the database. If the two encrypted versions match then the user has supplied the correct password.

But we won't just encrypt the password. We will combine the password with a *salt*, or randomly generated string of characters, that will make the original password more difficult to guess. Imagine that a user supplies a password like "password". That's a terrible password. 

Salting *"password"* turns it into a string like *"password^&%$asldkj2e"* and then encrypts that, making it much harder to guess. Moreover the salt will be re-generated each time a new user joins the site. We'll rarely if ever use the same salt for more than one user.

This involves a great deal of additional code. Fortunately we have a module available to us that takes care of it.

**Encrypting a password and comparing passwords**

We will use the `bcrypt` module to encrypt a password. It is based on the the [blowfish cypher](http://en.wikipedia.org/wiki/Bcrypt) and should provide strong protection against [brute force](http://en.wikipedia.org/wiki/Brute-force_attack) guessing.

Install the `bcrypt` module and save it to package.json:

	$ npm install bcrypt --save

If you are unable to install `bcrypt` use the `bycrpt-node` library instead and refer to it in your code:

	$ npm install bcrypt-node --save

We'll need to modify our user model to support password encryption and comparison. First require in the `bcrypt` module:

```js
var bcrypt = require('bcrypt'); // or 'bcrypt-node'
```

We'll then add *instance methods* to our User schema before defining the model. Instance methods are methods that are available on every actual instances of a User rather than the abstract User object. User instances are available in the query callbacks and when we create a user with the `new` keyword. We've been distinguishing between the model object `User` and an instance `user` with capitalization.

<!-- instances need to be better explained in the javascript chapters -->

Add two instance methods to the schema, one to generate the encrypted password, also known as a *hash*, and the other to compare a plain text password to an encrypted one:

```js
...

schema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

schema.methods.isValidPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

var User = mongoose.model('users', schema);
module.exports = User;
```

These methods just call sychronous bcrypt method to make the encryption and the later comparison.

It will be our responsibility to ensure that we don't store a plaintext version of the password with a paticular user but only ever a password that has been hashed. We'll call the method `generateHash` on a newly created user and assign the result to its password property, and when a user logs in we'll use the `isValidPassword` method to make the comparison.

**A word on encryption**

Don't do it yourself. Unless you are an export in crypotgraphy, never try to implement your own encryption algorithm. Use well established open source algorithms and the libraries that provide interfaces to them.

We're now ready to add routes and html for handling user signup and logging in. Let's begin with signing up.

## Signing Up a User

Like every operation we've supported so far the added data to a database, signing up a user is a two step process. A visit will `GET` form for providing their email address and password and then `POST` that form. We'll need router code to render the form and then handle the post along with the form's html.

**Routes**

Let's template out our routes first. We'll add the new routes to the `routes/users.js` file that Express created for us when we first started the project. This means our routes will always begin with `/users` thanks to the `app.use('/users', users)` line in *app.js*.

Right now we need two routes, one to get the form and one to post it. We'll use the same url for the two requests, `/users/signup`:

```js
router.get('/signup', function(req, res) {
  res.render('users/signup');
});

router.post('/signup', function(req, res) {
  res.redirect('/users/signup');
});
```

Our template routes just render the signup form or redirect the user back to it on the post.

**The sign up form**

Let's create the sign up form. Create a `views/users` folder in your project if you do not already have one and add the `views/users/signup.ejs` file:
	
	$ mkdir views/users
	$ touch views/users/signup.ejs

Add bootstrap styling to the file and embed the following html in a container div:

```html
<% if (message.danger) { %>
  <div class="alert alert-danger" role="alert">
    <%=message.danger%>
  </div>
<% } %>

<h1>User Sign Up</h1>
<form role="form" action="/users/signup" method="post">

  <div class="form-group">
    <label for="email" >Email address</label>
    <input type="email" id="email" name="email" class="form-control" placeholder="Valid email address" >
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input type="password" id="password" name="password" class="form-control" placeholder="Password" >
  </div>

  <button type="submit" class="btn btn-primary">Sign Up</button>
</form>
```

This is straightforward html. We've added ejs template code for a `'danger'` flash message at the top, which we'll use in case of an error, and then we're rendering a form with blank email and password fields. Notice that the `name` attribute for the two fields is `email` and `password` respectively, corresponding to our `User` schema attributes.

Restart your server and visit the `/users/signup` route to ensure the html and routing is correct. Try submiting the form. You should just see the form again.

**Handling the form input**

We now need to implement the `POST` request. We will first check if a user with that email address is already in the database. If so inform the user that the email provided is already in use. Typically you would also provide some way of reseting the password in case it's been forgotten.

If the email is not in use, create a new user and assign the email from the request body and a hashed password using the user instance method `generateHash`. Save the user using mongoose functions we are already familiar with. Check for errors along the way.

Finally, if the save is successful, flash a message that the user has logged in and redirect them to a page, such as a profiles page (which we haven't created yet) or the posts listing.

Implement this by replacing:

```js
router.post('/signup', function(req, res) {
  res.redirect('/users/signup');
});
```

with:

```js
router.post('/signup', function(req, res) {
  User.findOne({email: req.body.email}, function(err, user) {
    if (err) {
      res.render('500');
    } else if (user) {
      req.flash('danger', 'Email address already in use');
      res.redirect('/users/signup');
    } else {
      var user = new User();
      user.email = req.body.email;
      user.password = user.generateHash(req.body.password);
      user.save(function(err) {
        if (err) {
          res.render('500');
        } else {
          req.flash('success', "Thank's for signing up! You're now logged in.")
          res.redirect('/users/profile');
        }
      });
    }
  });
});
```

Restart the server and sign up a user. Examine the database from the mogno command line client. You should see a single user with a nicely encrypted password:

	$ mongo
	$ use blog
	$ db.users.find()
	{ "_id" : ObjectId("53dfae52dce15cfd3b0627f0"), "password" : "$2a$08$0RswbrfM6DlYKHfyrW5K2OM.orZeph1V4cQ8bMrGdzuundSEZE./i", "email" : "phil@test.com", "admin" : false, "__v" : 0 }

## Authenticating a User

User authentication is also a two step process. The user must `GET` a sign in page and then `POST` their email and password. The `GET` handler just needs to render the form. The `POST` handler will find the user in the database and compare the two passwords.

**Routes**

Being by templating out the routes, still in `routes/users.js`:

```
router.get('/login', function(req, res) {
  res.render('users/login');
});

router.post('/login', function(req, res) {
  res.redirect('/users/login');
});
```

**The login form**

The login form will be almost identicial to the sign in form. The only difference is the form's post path to `/users/login` instead of `/users/signup`:

```html
<% if (message.danger) { %>
  <div class="alert alert-danger" role="alert">
    <%=message.danger%>
  </div>
<% } %>

<h1>User Login</h1>
<form role="form" action="/users/login" method="post">

  <div class="form-group">
    <label for="email" >Email address</label>
    <input type="email" id="email" name="email" class="form-control" placeholder="Valid email address" >
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input type="password" id="password" name="password" class="form-control" placeholder="Password" >
  </div>

  <button type="submit" class="btn btn-primary">Sign Up</button>
</form>
```

**Handling the form input**

Once more we need to implement the `POST` request. We'll first locate the user in the database by their email address with the mongoose `findOne` function on the `User` model. That method will return a `user` instance in its callback.

We should then check if the user is `null` or if the password is not valid. In both cases we should redirect the user back to the login page and flash the same error message, "Email or password is incorrect". It is a customary precaution to not distinguish between a bad email address, in which case the user instance is null, or a bad password, as you may inadvertently reveal the email addresses in your database.

Replace

```js
router.post('/login', function(req, res) {
  res.redirect('/users/login');
});
```

with:

```js
router.post('/login', function(req, res) {
  User.findOne({email: req.body.email}, function(err, user) {
    if (err) {
      res.render('500');
    } else if (!user || !user.isValidPassword(req.body.password)) {
      req.flash('danger', 'Email or password is incorrect');
      res.redirect('/users/login');
    } else {
      req.flash('success', "You're now logged in.");
      res.redirect('/posts');
    }
  });
});
```

Restart the server and try logging in. First use a bad email address and password. You should see the flash error message. Use the correct credentials and you should be redirected to the `/posts` page with a successful flash message.

## Logout

Let's go ahead and template our logout route as well even though it won't really do anything at this point:

```js
router.get('/logout', function(req, res) {
  req.flash('success', "You're now logged out.");
  res.redirect('/posts');
});
```

We'll add more code to this once we've implemented user sessions.

<!--
### Profile

...
-->

## Summary

At this point we've laid the groundwork needed for managing a user. Users can sign up, log in and log out. Password are encrypted and checked.

But we don't have a way of knowing if a user is actually logged in once they visit another page, which means we also don't have a way of controlling access to those pages. In the next chapter we'll learn how to use the `passport` module to track users across multiple http requests, enforce access control and require that users log in before  accessing certain pages on the site.