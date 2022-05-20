const express = require( 'express' );
const router = express.Router();
const routeRoot = '/';
const model = require( '../models/cardModel' );
const logger = require('../logger');
const { REPL_MODE_STRICT } = require('repl');

module.exports = {
    router,
    routeRoot,
    addCard,
    listAllCards, 
    getSpecificCard,
    listCardsByUser,
    editSpecificCard,
    deleteSpecificCard,
    listCardsForSale
}

async function addCard( request, response ) {
    try{
        let card = await model.addCard( request.body.cardName, request.body.type, request.body.description, request.body.serialNumber, request.body.frontImagePath, request.body.backImagePath
            ,request.body.isForSale, request.body.cardCondition, request.body.certificateImage, request.body.cardPrice, request.body.cardOwner );
        
        response.redirect( '/cards/user' );
        // response.send( card );
        // response.status( 200 );
    }
    catch( error ){
        if(error instanceof model.SystemError){
            response.redirect( '/cards/user?addCard=true&errorMessage=system' );
            logger.error( error );
            // response.send( "Could not add card due to error" );
            // response.status( 500 );
        }
        else if(error instanceof model.UserInputError){
            response.redirect( '/cards/user?addCard=true&errorMessage=input' );
            // response.render( 'mainPageCards.hbs', { addCard: true, errorMessage: "Card add failed due to invalid input" });
            logger.error( error );
            // response.send( "Could not add card due to invalid input" );
            // response.status( 400 );
        } 
        else{
            logger.error( error.message );
        }
    }
}

router.post( '/card', addCard );

async function listAllCards( request, response ){
    try{
        let listOfCards = await model.readFromCardTable();
        // const dataToSend = { fabric: listOfFabric };
        // response.status( 200 );
        // response.render( 'showAllFabric.hbs', dataToSend );
        response.send( listOfCards );
    }
    catch( error ){
        logger.error( error );
        response.send( error.message );
        response.status( 500 );
        // response.render( 'home.hbs', { errorClass: "alert alert-primary", alertMessage: 'Cannot get all fabric items from database' });
    }
}

router.get( '/cards', listAllCards ); // can it be plural since the idea is multiple


async function getSpecificCard( request, response ){
    try{
        let id = request.params.id;
        let card = await model.findCardRecord( id );
        // const dataToSend = { fabric: listOfFabric };
        // response.status( 200 );
        // response.render( 'showAllFabric.hbs', dataToSend );

        if( card != null ){
            response.send( card );
        }
        else{
            response.send( `Could not find card with id ${id}` );
        }

    }
    catch( error ){
        if( error instanceof model.SystemError ){
            logger.error( error );
            response.send( "Could not find card due to error" );
            response.status( 500 );
            // response.render( 'showSpecificFabricForm.hbs', { errorClass: "alert alert-primary", alertMessage: 'Getting fabric with specified name failed' });
        }
        else if( error instanceof model.UserInputError ){
            logger.error( error );
            response.send( `Could not find card with id ${id}` );
            response.status( 400 );
            // response.render( 'showSpecificFabricForm.hbs', { errorClass: "alert alert-secondary", alertMessage: `Fabric name: ${request.params.name} does not exist in database` });
        } 
        else{
            response.send( `Could not find card with id ${id}` );
            response.status( 500 );
            logger.error( error.message );
        }
    }
}

// router.get( '/card/:id', getSpecificCard ); 

async function listCardsByUser( request, response ){
    try{
        response.cookie( "endpoint", '/cards/user', { expires: new Date(Date.now() + 560 * 60000) }); 
        
        // let username = request.cookies['username'];
        let username = request.cookies['userName'];
        let userCards = await model.getCardsByOwner( username );
        let dataToSend = { cards: userCards, endpoint: "/cards/user", userMode: true, currentUser: username }; 
        let isSearch = false;

        if( (request.query.searchBarSearch != '') && (request.query.searchBarSearch != null ) && ( userCards != null )){
            userCards = search( request, userCards );
            isSearch = true;
            dataToSend.cards = userCards;
        }

        if( request.query.addCard != null ){
            dataToSend.addCardOrEditCard = true; 
            dataToSend.addCard = true;
            dataToSend.addOrEditMessage = 'Add Card to Your Collection';
            dataToSend.addOrEditEndpoint = '/card';
            dataToSend.inputMessage = 'Add Card';
        }     
        else if( request.query.editCard != null ){
            let cardData = await model.findCardRecord( request.query.editCard );
            dataToSend.addCardOrEditCard = true; 
            dataToSend.addOrEditMessage = `Editting Card`;
            dataToSend.addOrEditEndpoint = '/card';
            dataToSend.inputMessage = 'Confirm Changes';
            dataToSend.cardToEdit = cardData;
            dataToSend.addOrEditEndpoint = '/card/edit';
        }

        if( request.query.errorMessage != null ){
            dataToSend.errorMessage = request.query.errorMessage == 'system' ? "Card add failed due to system error" : "Card add failed due to invalid input";
        }

        if( request.query.id != null ){
            let cardData = await model.findCardRecord( request.query.id );
            cardData.IsForSale = cardData.IsForSale == 1 ? 'Yes' : 'No';
            dataToSend.specificCardData = cardData;
        }

        if( request.query.cardType != null && userCards != null ){
            userCards = getFilterResults( request, userCards );
        }
        
        if( userCards != null ){
            if( userCards.length == 0 ){
                let message = isSearch ? `No Cards Matching "${request.query.searchBarSearch}" Found In Your Collection` : "No Cards Matching Applied Filters Found";
                dataToSend = { cardEndpoint: "/cards/sale", noCardMessage: message };
            }

            response.render( 'mainPageCards.hbs', dataToSend );  
        }
        else{
            dataToSend.noCardMessage = "You don't have any cards! Add a card to your collection to start.";
            dataToSend.cards = true;
            response.render( 'mainPageCards.hbs', dataToSend );  
        }
    }
    catch( error ){
        logger.error( error );
        response.send( `Unable to retreive cards for user ${username}` );
        response.status( 500 );
        // response.render( 'home.hbs', { errorClass: "alert alert-primary", alertMessage: 'Cannot get all fabric items from database' });
    }
}

router.get( '/cards/user', listCardsByUser );

async function listCardsForSale( request, response ){
    try{
        response.cookie( "endpoint", '/cards/sale', { expires: new Date(Date.now() + 560 * 60000) }); 

        let cardsForSale = await model.getCardsForSale();
        let isSearch = false;

        if( (request.query.searchBarSearch != '') && (request.query.searchBarSearch != null ) && ( cardsForSale != null )){
            cardsForSale = search( request, cardsForSale );
            isSearch = true;
        }

        if( request.query.cardType != null ){
            cardsForSale = getFilterResults( request, cardsForSale );
        }

        let dataToSend = { cards: cardsForSale, cardEndpoint: "/cards/sale", buyMode: true }; 

        // if( request.query.numItemsInCart != null ){
        //     dataToSend.numItemsInCart = request.query.numItemsInCart;
        // }


        if( request.query.id != null ){
            let cardData = await model.findCardRecord( request.query.id );
            dataToSend.specificCardData = cardData;
        }


        if(cardsForSale != null){ 
            if( cardsForSale.length == 0 ){
                let message = isSearch ? `No Cards For Sale Matching "${request.query.searchBarSearch}" Found` : "No Cards Matching Applied Filters Found";
                dataToSend = { cardEndpoint: "/cards/sale", noCardMessage: message };
            }

            response.render( 'mainPageCards.hbs', dataToSend );                   
        }
        else{
            response.render( 'mainPageCards.hbs', { cardEndpoint: "/cards/sale", noCardMessage: "Sorry, No Cards are Available for Sale" } );
        }
    }
    catch( error ){
        logger.error( error );
        response.send( `Unable to retreive cards for sale` );
        response.status( 500 );
        // response.render( 'home.hbs', { errorClass: "alert alert-primary", alertMessage: 'Cannot get all fabric items from database' });
    }
}

router.get( '/cards/sale', listCardsForSale );

function getFilterResults( request, cards ){
    let type = request.query.cardType;
    let minCondition = parseInt( request.query.minCondition );
    let maxCondition = parseInt( request.query.maxCondition );
    let minPrice = request.query.minPrice != null ? parseInt( request.query.minPrice ) : null;
    let maxPrice = request.query.maxPrice != null ? parseInt( request.query.maxPrice ) : null;

    if(type != "All types"){
        cards = cards.filter( ( card ) => {
            return card.Type == type.toLowerCase();
        });
    }

    cards = cards.filter( ( card ) => {
        return card.CardCondition >= minCondition && card.CardCondition <= maxCondition;
    });

    if( minPrice != null ){
        cards = cards.filter( ( card ) => {
            if( card.CardPrice != null ){
                return card.CardPrice >= minPrice && card.CardPrice <= maxPrice;
            }
            else{
                return false;
            }
    
        });
    }
    
    return cards;
}

function search( request, cards ){
    let name = request.query.searchBarSearch;

    return cards.filter( ( card ) => {
        return card.CardName == name.toLowerCase();
    });
}

async function editSpecificCard( request, response ){
    try{
        let id = request.body.editId;
        let currentCard = await model.findCardRecord( id );
        let frontImagePath = request.body.editFrontImagePath == 'on' ? request.body.frontImagePath : currentCard.FrontImagePath;
        let backImagePath = request.body.editBackImagePath == 'on' ? request.body.backImagePath : currentCard.BackImagePath;
        let certificateImage = request.body.editCertificate == 'on' ? request.body.certificateImage : currentCard.CertificateImage;
        let isForSale = request.body.isForSale == 'on' ? true : false;

        let card = await model.updateRowInCardTable( id, request.body.cardName, request.body.type, request.body.description, request.body.serialNumber, 
            frontImagePath, backImagePath, isForSale, request.body.cardCondition, certificateImage, request.body.cardPrice, request.body.cardOwner );

        response.redirect( `/cards/user?id=${id}`);
        // const dataToSend = { fabric: listOfFabric };
        // response.status( 200 );
        // response.render( 'showAllFabric.hbs', dataToSend );
        // response.send( card );
    }
    catch( error ){
        if( error instanceof model.SystemError ){
            logger.error( error );
            response.send( { error: error});
            response.status( 500 );
        }
        else if( error instanceof model.UserInputError ){
            logger.error( error );
            response.send( { error: error});
            response.status( 400 );
        } 
        else{
            logger.error( error.message );
        }
    }
}

router.post( '/card/edit', editSpecificCard ); 

async function deleteSpecificCard( request, response ){
    try{
        let id = request.body.deleteCard;
        let result = await model.deleteRowFromCardTable( id )

        if( result ){
            response.redirect( '/cards/user' );
        }

        // if( result ){
        //     response.send( "Successfully deleted card with id " + id );
        // }
        // else{
        //     response.send( `Unable to delete card with id: ${id}` );
        // }

        // response.status( 200 );
    }
    catch( error ){
        if( error instanceof model.SystemError ){
            response.send( `Could not find card with id: ${id} to delete` );
            response.status( 500 );
            // response.render( 'deleteFabricForm.hbs', { errorClass: "alert alert-primary", alertMessage: 'Deleting fabric with specified name failed' });
        }
        else if( error instanceof model.UserInputError ){
            response.send( `Could not find card with id: ${id} to delete` );
            response.status( 400 );
            // response.render( 'deleteFabricForm.hbs', { errorClass: "alert alert-secondary", alertMessage: `Fabric name: ${request.params.name} does not exist in database` });
        } 
        else{
            response.send( `Unable to delete card with id: ${id}` );
            response.status( 500 );
            logger.error( error.message );
        }
    }
}

router.post( '/card/delete', deleteSpecificCard );
