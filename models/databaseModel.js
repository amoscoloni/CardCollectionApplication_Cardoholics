const cardModel = require('./models/cardModel');
const transactionModel = require('./models/transactionModel');
const userModel = require('./models/userModel');


async function initialize( databaseFilename, resetFlag ){
    try{
        connection = await mysql.createConnection({
            host: 'localhost', 
            user: 'root',
            port: '10000',
            password: 'pass',
            database: databaseFilename
        });
    
        if( resetFlag ){
            await cardModel.dropCardTable().catch( (error ) => { 
                error = `Issue with clearing fabric table: ${error}`;
                logger.error( error ); 
                throw( error );
            }); // have to throw here if not execution continues
            
            logger.info( 'Fabric table reset.' );
        }
               
        await cardModel.createCardTable().catch( (error) => {
            error = `Issue with creating fabric table: ${error}`;
            logger.error( error ); 
            throw( error );
        });

        await transactionModel.createTransactionTable().catch( (error) => {
            error = `Issue with creating fabric table: ${error}`;
            logger.error( error ); 
            throw( error );
        });

        await userModel.createUserTable().catch( (error) => {
            error = `Issue with creating fabric table: ${error}`;
            logger.error( error ); 
            throw( error );
        });
    }
    catch( error ){
        logger.error( `Error: Unable to initialize database: ${error}` );
    }
}

/**
 * Gets the connection to the current database and returns it.
 * The database and connection are initialized before the
 * function is called.
 * @returns the connection to the database.
 */
 function getConnection(){
    return connection;
}

module.exports = {
    initialize,
    getConnection
};