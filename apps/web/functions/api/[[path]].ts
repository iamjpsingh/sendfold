// Pages only forwards API traffic. Authentication and data live in the bound Worker.
interface Env { API:{fetch(request:Request):Promise<Response>} }
export const onRequest=({request,env}:{request:Request;env:Env})=>env.API.fetch(request);
