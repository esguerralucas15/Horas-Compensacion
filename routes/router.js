import { Router } from "express";
    const router = Router();
    router.get('/', (request, response) => {
        response.render('index', {
            message: 'Hello'
        })
        	
        	
    })
    export default router;    
    