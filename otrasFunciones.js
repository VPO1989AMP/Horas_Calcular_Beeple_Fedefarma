const axios = require("axios");
const bodyParser = require("body-parser");


const getVacacionesId = async (headers,endpoint,nameVacaciones) => {
    try {
        const masterDisponibilidades = await axios.get(`${endpoint}/api/v1/admin/tenant/availability_types`, {
            headers: headers
        });
        //console.log(masterDisponibilidades.data.availability_types)
        const vacacionesObject = masterDisponibilidades.data.availability_types.find(item=>{
            return item.name_i18n_attributes.es == nameVacaciones
        })

        if (vacacionesObject) {
            return vacacionesObject.id;
        } else {
            return null
        }

    } catch (error) {
        throw error; // Lanzamos el error para manejarlo afuera
    }
};


const getProyecto = async (endpoint,headers,departamento)=> {
    try {
        const masterProyectos = await axios.get(`${endpoint}/api/v1/admin/projects`, {
            headers: headers
        });
        //console.log(masterDisponibilidades.data.availability_types)
        const proyectoObject = masterProyectos.data.projects.find(item=>{
            return item.department.id == departamento
        })

        if (proyectoObject){
            return proyectoObject.id
        } else{
            return null
        }


    } catch (error) {
        throw error; // Lanzamos el error para manejarlo afuera
    }
};


const getDisponibilidadesMaster = async (endpoint, headers) => {
    try {
            const masterDisponibilidadesData = await axios.get(`${endpoint}/api/v1/admin/tenant/availability_types`, {
            headers: headers
        });
        const masterDisponibilidades = masterDisponibilidadesData.data.availability_types

        return masterDisponibilidades ? masterDisponibilidades : null;
    } catch (error) {
        console.error('Error fetching master disponibilidades:', error);
        throw error; // Lanzamos el error para manejarlo afuera
    }
};




module.exports = {
    getVacacionesId,
    getProyecto,
    getDisponibilidadesMaster,
};