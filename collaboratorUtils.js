const axios = require("axios");
const bodyParser = require("body-parser");

const getAvailability = async (headers, endpoint, idCollaborator, desde, hasta) => {
    const retries = 2;
    const delay = 1000;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            //const url = `${endpoint}/api/v1/admin/collaborators/${idCollaborator}/availabilities2?start=${desde}&end=${hasta}&page_items=800`;
            const url = `${endpoint}/api/v1/admin/collaborators/${idCollaborator}/availabilities2?start=2024-01-01&end=2024-12-31&page_items=800`;
            const availabilityResponse = await axios.get(url, { headers: headers });
            return availabilityResponse.data.availabilities;
        } catch (error) {
            if (attempt < retries) {
                console.log(`Attempt ${attempt} failed. Retrying in ${delay} ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error; // Lanzamos el error para manejarlo afuera
            }
        }
    }
};

const getColaboratorDetail = async (headers, endpoint, collaboratorId) => {
    try {              
        // Realizar la solicitud para obtener información adicional del colaborador
        const collaboratorDetail = await axios.get(`${endpoint}/api/v1/admin/collaborators/${collaboratorId}`, {
            headers: headers
        });
        // Obtener información adicional del colaborador de la respuesta
        const collaboratorInfo = collaboratorDetail.data;

        // Crear un nuevo objeto con los campos deseados
        const desiredFields = {}
            //Añadimos el tipo de contrato
            if (collaboratorInfo.default_contract_type==="contractual"){
                desiredFields["collaborator_type_contract"]="GESGRUP"
            }else if(collaboratorInfo.default_contract_type==="interim"){
                desiredFields["collaborator_type_contract"]="P7"
            }else if(collaboratorInfo.default_contract_type==="intern"){
                desiredFields["collaborator_type_contract"]="SUBROGADO CTC"
            }

            //Documento
            if (collaboratorInfo.national_identification_be != null && collaboratorInfo.national_identification_be !=""){
                desiredFields["dniNie"] = collaboratorInfo.national_identification_be
            }else if(collaboratorInfo.national_identification_de != null && collaboratorInfo.national_identification_de !=""){
                desiredFields["dniNie"] = collaboratorInfo.national_identification_de
            }else if(collaboratorInfo.national_identification_nl != null && collaboratorInfo.national_identification_nl !=""){
                desiredFields["dniNie"] = collaboratorInfo.national_identification_nl
            }else if(collaboratorInfo.national_identification_fr != null && collaboratorInfo.national_identification_fr !=""){
                desiredFields["dniNie"] = collaboratorInfo.national_identification_fr
            }else if(collaboratorInfo.national_identification_es != null && collaboratorInfo.national_identification_es !=""){
                desiredFields["dniNie"] = collaboratorInfo.national_identification_es
            }else if(collaboratorInfo.national_identification_es_foreign != null && collaboratorInfo.national_identification_es_foreign !=""){
                desiredFields["dniNie"] = collaboratorInfo.national_identification_es_foreign
            }else if(collaboratorInfo.national_identification_cl != null && collaboratorInfo.national_identification_cl !=""){
                desiredFields["dniNie"] = collaboratorInfo.national_identification_cl
            }
            
            ///OJOOOOO SI HAGO ESTO PARA OTRO TENANTS HABRÁ QUE REVISAR QUE SEA IGUAL
            for (const elem of collaboratorInfo.profile_property_groups[2].profile_properties) {
                // Aquí puedes agregar una condición para determinar si incluir el campo en el objeto desiredFields
               //Fecha alta
               if (elem.property_id === 4283 ) {
                desiredFields[elem.name] = elem.value;
                }
                //Fecha baja
                if (elem.property_id === 4284 ) {
                    desiredFields[elem.name] = elem.value;
                }
                //Horas contrato dia
                if (elem.property_id === 4638 ) {
                    desiredFields[elem.name] = elem.value;
                }
                //Horas contrato semana
                if (elem.property_id === 4639 ) {
                    desiredFields[elem.name] = elem.value;
                }
                //Convenio
                //if (elem.property_id === 33 ) {
                //  desiredFields[elem.name] = elem.value;
                //}
                //Jornada
                if (elem.property_id === 4640 ) {
                    desiredFields[elem.name] = elem.value;
                }
                //Categoria laboral
                if (elem.property_id === 4641 ) {
                    desiredFields[elem.name] = elem.value;
                }
                //Cod trabajador NET 4
                if (elem.property_id === 4593 ) {
                    desiredFields[elem.name] = elem.value;
                }
                
            }
        

        return desiredFields; // Devuelve solo los campos deseados del colaborador
    } catch (error) {
        throw error; // Lanzar el error para manejarlo afuera
    }
};



const getCounters = async (headers, endpoint, idCollaborator) => {
    try {
        const acountersResponse = await axios.get(`${endpoint}/api/v1/admin/collaborators/${idCollaborator}/counters`, {
            headers: headers
        });

        return acountersResponse.data.counters            

    } catch (error) {
        throw error; // Lanzamos el error para manejarlo afuera
    }
};





module.exports = {
    getAvailability,
    getColaboratorDetail,
    getCounters,
};