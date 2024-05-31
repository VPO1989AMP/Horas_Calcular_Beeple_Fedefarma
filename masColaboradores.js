const axios = require("axios");
const moment = require("moment");
const bodyParser = require("body-parser");

async function masColaboraders(workhoursFiltrados,headers,endpoint,departamento,desde,hasta){
    try {
        const collaboratorsAll = await axios.get(`${endpoint}/api/v1/admin/collaborators?page_items=10000`, {
            headers: headers
        });

        //return collaborators.data.collaborators.filter(item => item.department_ids[0]==departamento)            
        //const collaboratorsDepartment = collaboratorsAll.data.collaborators.filter(item => ((item.department_ids[0]==departamento) && ((item.blocked===false)  || ((item.blocked===true &&  moment(item.blocked_at)).isSameOrAfter(moment(desde)))))) 
        const collaboratorsDepartment = collaboratorsAll.data.collaborators.filter(item => {
            const isInDepartment = item.department_ids[0] == departamento;
            const isNotBlocked = item.blocked === false;
            const isBlocked = item.blocked === true;
            const isBlockedAfterDateDesde = moment(item.blocked_at).isSameOrAfter(moment(desde));
            const isBlockedBeforeDateHasta = (moment(item.blocked_at)).isSameOrBefore(moment(hasta).add(10, 'days'));
           
            return isInDepartment && (isNotBlocked || (isBlocked && isBlockedAfterDateDesde && isBlockedBeforeDateHasta) );
        });
        
        //console.log(collaboratorsDepartment)
        if (collaboratorsDepartment){
            for (const item of collaboratorsDepartment ){
                if (!(workhoursFiltrados.some(obj => obj.collaborator_id === item.id))){
                    console.log(" ##### El colaborador con id ", item.id, " se añade al workhoursfiltrados a pesar de no tener horas ####")
                    workhoursFiltrados.push({
                        "collaborator_id": item.id,
                        "collaborator_name": "*** " + item.name + " ***",
                        "department_id":departamento,
                        "shift_date": "",
                        "start_confirmed": "",
                        "end_confirmed": "",
                        "confirmed_absent": false,
                        "absence_reason": "",
                        "choice_made": "",
                        "duration_work": 0,
                        "start_confirmed_rounded":"",
                        "end_confirmed_rounded":"",
                        "duration_work_night_hours":0,
                        "duration_work_day_hours":0,
                        "duration_work_rounded":null,
                    });
                }
                
            }
        }


    } catch (error) {
        //throw error; // Lanzamos el error para manejarlo afuera
        console.log(error)
    }
};

module.exports = {
    masColaboraders,
};