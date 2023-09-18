# CardoHolics - Card Collecting Web Application
## Description
Created as a final project for a Web Programming II course in Winter 2022 in collaboration with [Simon Stasovski](https://github.com/Simon-Stasovski "Simon Stasovski GitHub") and [Kevin Laskai](https://github.com/kevinlaskai "Kevin Laskai GitHub"). This web application provides a utility for card collectors to upload their cards and store their card deck virtually as well as sell and buy from other users' collections. Users are able to create an account and upload, manage, edit and view their card deck as well as filter their deck or search for a specific card. Users can also put their cards up for sale and shop other user's cards and purchase them. Filters as well as targeted searches are also available when shopping for cards. 

I worked mostly on all of the functionalities relating to cards (cardModel, cardController, etc... as well as the Shopping Cart cookies.)

## Main Technologies and Architecture
Technologies such as Docker, Node.js, Handlebars, Cookies, User Authentication, jest and Jest Puppeteer are utilized in this project. The project is built using the MVC architectural pattern.

## Running App

# To create docker container 
docker run -p 10000:3306 --name cardoholicsContainer -e MYSQL_ROOT_PASSWORD=[password] -e MYSQL_DATABASE=cardoholics_db -d mysql:5.7

# To run docker container
docker container exec -it cardoholicsContainer bash

# To log in as root user
mysql –u root –p