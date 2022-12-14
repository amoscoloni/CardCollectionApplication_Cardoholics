let connection;
const utilsMYSQL = require('../utilitiesMYSQL');

class InvalidInputError extends Error {   
    constructor(message) {
        super(message);
        this.name = "InvalidInputError";
  }
};
class InvalidDatabaseError extends Error { 
    constructor(message) {
        super(message);
        this.name = "InvalidDatabaseError";
  }
};
/**
 * Creates the Transaction table if it does not exist for a given database.
 * @param {*} databaseConnection The connection to the database that the table will be created in.
 */
async function createTransactionTable(databaseConnection){

    connection = databaseConnection;

    const sqlQuery = "CREATE TABLE IF NOT EXISTS Transaction(TransactionID int "
        + "AUTO_INCREMENT, Price DECIMAL(8, 2), "
        + "CardID int, FOREIGN KEY(CardID) " 
        + "REFERENCES Card(CardID), OriginalOwner varchar(25), FOREIGN KEY(OriginalOwner) "
        + "REFERENCES users(username), NewOwner varchar(25), FOREIGN KEY(NewOwner) "
        + "REFERENCES users(username), TransactionDate Date, PRIMARY KEY(TransactionID));";

    try{
        await connection.execute( sqlQuery ).catch(( error ) => { throw( error ); }); 
    }
    catch( error ){
        await dropTransactionTable().catch( ( error ) => { 
            let errorMessage = "Unable to drop Transaction table for reset";
            throw( errorMessage );
        });

        await connection.execute( sqlQuery ).catch(( error ) => {
            let errorMessage = "Unable to create Transaction table";
            throw( errorMessage );
        });

        console.info( 'Transactions table successfully initialized. File reset due to error.' );
    }
}
/**
 * Drops the Transaction table.
 */
async function dropTransactionTable(){
    try{
        if ( connection === undefined ){
            throw( "Database or connection not initialized" );
        }
        else{
            const sqlQuery =  "DROP TABLE IF EXISTS Transaction";

            await connection.execute( sqlQuery ).catch(( error ) => { 
                let errorMessage = `Unable to drop Transaction table: ${error}`;
                throw( errorMessage ); 
            });   

            console.info( "Transaction table dropped successfully"); 
        }
    }
    catch( error ){
        let errorMessage = `Error: Could not clear data in Transaction table in the database: ${error}`;
        console.error( errorMessage );
        throw( errorMessage );
    }
}
/**
 * Creates a transaction from the information from the username of the buyer and the
 * and information from the buyer.
 * @param {*} cardObject JSON object containing all the columns of particular card. 
 * @param {*} buyer The username of the buyer of the card.
 * @returns Returns the Transation Id of the newly created transaction.
 */
async function createTransaction(cardObject, buyer){
    try{

        var today = new Date();
        var day= String(today.getDate()).padStart(2, '0');
        var month = String(today.getMonth() + 1).padStart(2, '0');
        var year = today.getFullYear();
        
        today = year + '-' + month + '-' + day;
        let insertQuery = `INSERT INTO Transaction(Price, CardID, OriginalOwner, NewOwner, TransactionDate) VALUES (${cardObject.CardPrice}, ${cardObject.CardID}, '${cardObject.CardOwner}', '${buyer}', '${today}');`;
        
        await utilsMYSQL.executeCommand(insertQuery, connection);

        let getLatestIdQuery = 'SELECT TransactionID from Transaction ORDER BY TransactionID DESC LIMIT 1;'

        let result = await connection.query(getLatestIdQuery, [], (err, rows) => {

        });

        if(result[0] == undefined){
            throw new InvalidInputError("Can not create a transaction with these inputs");
        }

        return result[0];


        return ;
    
    } catch (e){
        throw e;
    }
}
/**
 * Retrieves transactions based on certain filtering criteria.
 * @param {*} startDate The start date of the time range.
 * @param {*} endDate The end date of the time range.
 * @param {*} filterType Flag to indicate whether the user wants to filter by card type.
 * @param {*} cardType The type of the card.
 * @param {*} isSeller Flag to indicate if the user wants to see his sales.
 * @param {*} isBuyer Flag to indicate if the user wants to see his purchases.
 * @param {*} username The username of the currently logged in user.
 * @returns A list of transaction in accordance to the user's filtering options.
 */
async function getSpecifiedTransactions(startDate, endDate, filterType, cardType, isSeller, isBuyer, username){

    try{
        let selectQuery;

        if(isSeller && isBuyer){
            throw new InvalidInputError("Please select either filter by buyer or seller");
        }
        else if(isSeller && !isBuyer && !filterType){
            selectQuery = `SELECT t.TransactionId, c.CardName, t.TransactionDate, t.Price, t.OriginalOwner, t.NewOwner FROM Transaction t INNER JOIN Card c ON t.CardID = c.CardID INNER JOIN users u On t.OriginalOwner = u.username WHERE t.TransactionDate >= '${startDate}' AND t.TransactionDate <= '${endDate}' AND t.OriginalOwner = '${username}';`
        }
        else if(isSeller && !isBuyer && filterType){
            selectQuery = `SELECT t.TransactionId, c.CardName, t.TransactionDate, t.Price, t.OriginalOwner, t.NewOwner FROM Transaction t INNER JOIN Card c ON t.CardID = c.CardID INNER JOIN users u On t.OriginalOwner = u.username WHERE t.TransactionDate >= '${startDate}' AND t.TransactionDate <= '${endDate}' AND c.type = '${cardType}' AND t.OriginalOwner = u.Username AND t.OriginalOwner = '${username}';`
        }
        else if(!isSeller && isBuyer && !filterType){
            selectQuery = `SELECT t.TransactionId, c.CardName, t.TransactionDate, t.Price, t.OriginalOwner, t.NewOwner FROM Transaction t INNER JOIN Card c ON t.CardID = c.CardID INNER JOIN users u On t.NewOwner = u.username WHERE t.TransactionDate >= '${startDate}' AND t.TransactionDate <= '${endDate}' AND t.NewOwner = '${username}';`
        }
        else if(!isSeller && isBuyer && filterType){
            selectQuery = `SELECT t.TransactionId, c.CardName, t.TransactionDate, t.Price, t.OriginalOwner, t.NewOwner FROM Transaction t INNER JOIN Card c ON t.CardID = c.CardID INNER JOIN users u On t.NewOwner = u.username WHERE t.TransactionDate >= '${startDate}' AND t.TransactionDate <= '${endDate}' AND c.type = '${cardType} AND t.NewOwner = '${username}';`
        }
        else{
            throw new InvalidInputError("Please select either filter by buyer or seller");
        }

        let result = await connection.query(selectQuery, [], (err, rows) => {

        });

        if(result[0] == undefined){
            throw new InvalidInputError("There are no transactions found with this parameters");
        }

        return result[0];

    }catch(e){
        throw e;
    }

}
/**
 * Changed the date of a particular transaction.
 * @param {*} transactionId The transaction id of the transaction to be changed.
 * @param {*} newDate The new date of the transaction.
 * @returns {boolean} True if the transaction was updated, error otherwise.
 */
async function UpdateDate(transactionId,  newDate){
    try{
        let updatePrice = `UPDATE Transaction SET TransactionDate = '${newDate}' WHERE TransactionID = ${transactionId};`;

        await utilsMYSQL.executeCommand(updatePrice, connection);

        return true;

    }catch(e){
        throw e;
    }
}
/**
 * Deletes a particular Transaction from the database.
 * @param {*} transactionId The transaction id of the transaction to be deleted.
 * @returns {boolean} Whether the transaction was successfully deleted.
 */
async function DeleteTransaction(transactionId){

    try{

        transactionId = transactionId/ 1;

        let deleteTransaction = `DELETE FROM Transaction WHERE TransactionID = ${transactionId};`;

        await utilsMYSQL.executeCommand(deleteTransaction, connection);

        return true;


    }catch(e){
        throw e;
    }

}
/**
 * Sets the connection to  particular connection promise object
 * @param {*} cnn The connection promise 
 */
function setConnection(cnn){
    connection = cnn;
}

module.exports = {
    createTransactionTable,
    dropTransactionTable,
    createTransaction,
    getSpecifiedTransactions,
    UpdateDate,
    DeleteTransaction,
    setConnection,
}