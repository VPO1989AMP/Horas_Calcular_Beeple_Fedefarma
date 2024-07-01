const moment = require("moment");


function Calculos(tablaFinal) {
    const tablaResultado = [];
    //console.log("Toda la tabla",tablaFinal);
    for (const item of tablaFinal) {
        //console.log("item",item)
        let horasTeoricas = 0
        let id = item["collaborator_id"];
        let horasDia = parseFloat(item["collaborator_horas_contrato_dia"])
        let jornada = item["collaborator_jornada"];
        let jornadaArray = (jornada!==null) ? jornada.split("-") : null
        let fechaAlta = new Date(item["collaborator_fecha_alta"].toString());
        let fechaBaja = item["collaborator_fecha_baja"] !== null ? new Date(item["collaborator_fecha_baja"].toString()) : null;
        if (jornada != null) {
            for (const key in item) {
                //Buscamos solo los campo key que sean fechas
                if (!isNaN(new Date(key).getTime())){
                    let fecha = new Date(key.toString());
                    // Verifica si fechaAlta está definido y si la fecha actual está después de fechaAlta
                    if (moment(fechaAlta).isSameOrBefore(moment(fecha)) && (fechaBaja === null || moment(fechaBaja).isSameOrAfter(moment(fecha)))) {
                        let diaFecha = moment(fecha).day()
                        for (const dia of jornadaArray){
                            if (transformarDia(dia)===diaFecha){
                                //Añado esto para que el calculo de horas teóricas
                                //solo se considere si está vacio ese dia.
                                //Además de revisar que trabaja ese dia
                                if (item[key] !== null && item[key] !== "" ){
                                    horasTeoricas += horasDia
                                    //console.log(id,key,item[key],)
                                }
                            }
                        }
                    }
                }
            }
            // console.log(horasTeoricas,item["horas_totales"],item["total_AJ"])
            item["collaborator_horas_teoricas"]= parseFloat((horasTeoricas - item["total_AJ"])).toFixed(2)
            item["collaborator_diferencia_horas"] =parseFloat((item["horas_totales"] + item["total_AJ"] - horasTeoricas)).toFixed(2)
            let difHTeoricas = item["horas_totales"] + item["total_AJ"] - horasTeoricas 
            if (difHTeoricas >= item["max_horas_complementarias"]){
                item["collaborator_h_complementarias"]=parseFloat((item["max_horas_complementarias"])).toFixed(2)
                item["collaborator_h_extras"] = parseFloat((item["collaborator_diferencia_horas"] - item["max_horas_complementarias"]).toFixed(2));
            }else if(difHTeoricas >0 && difHTeoricas < item["max_horas_complementarias"]){
                item["collaborator_h_complementarias"] = difHTeoricas.toFixed(2)
                item["collaborator_h_extras"]= 0
            }else{
                item["collaborator_h_complementarias"]=0
                item["collaborator_h_extras"]=0
            }
        } else{
            item["collaborator_horas_teoricas"]= 0
            //item["collaborator_total_horas"] = item["horas_totales"] + item["total_AJ"] 
            item["collaborator_diferencia_horas"] =parseFloat(item["horas_totales"] + item["total_AJ"] - 0).toFixed(2)
            item["collaborator_h_complementarias"]=0
            item["collaborator_h_extras"]=0
        }
    }
    //console.log(tablaFinal)
    //return tablaFinal;
}

function transformarDia(dia){
        if (dia == "L"){
            return 1
        }else if (dia =="MA"){
            return 2
        }else if (dia =="MI"){
            return 3
        }else if (dia =="J"){
            return 4
        }else if (dia =="V"){
            return 5
        }else if (dia =="S"){
            return 6
        }else if (dia =="D"){
            return 0
        }else{
            return 99
        }
}



function ObtenerNombreMes(mesNumero){
    const nombresMeses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
        return nombresMeses[mesNumero]; // Restamos 1 porque los meses van de 0 a 11
}

// Función para redondear al cuarto de hora superior
// Función para redondear al cuarto de hora superior
function roundQuarterHour(dateString, type) {
    // Convertir la cadena de fecha en un objeto Date
    let formattedString = dateString.substring(0, dateString.indexOf('+')) + 'Z';

    let date = new Date(moment(formattedString))
    //let date = moment.tz(dateString, moment.tz.guess());
    //console.log(date)

    // Obtener los minutos de la fecha
    let minutes = date.getMinutes();

    if (minutes % 15 === 0) {
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
    }
    // Calcular cuántos minutos faltan para llegar al cuarto de hora anterior
    let minutesToSubtract = minutes % 15;

    // Agregar los minutos faltantes
    if (type === "up") {
        let minutesToAdd = 15 - minutesToSubtract;
        if (minutesToAdd>=10){
            date.setMinutes(date.getMinutes() - minutesToSubtract);
        }else{
            date.setMinutes(date.getMinutes() + minutesToAdd);
        }
    } else if (type === "down") {
        if (minutesToSubtract>=11){
            //si estamos muy cerca de la hora superior lo ponemos arriba
            let minutesToAdd = 15 - minutesToSubtract;
            date.setMinutes(date.getMinutes() + minutesToAdd);
        }else{
            date.setMinutes(date.getMinutes() - minutesToSubtract);
        }
    }

    // Establecer los segundos y milisegundos en 0
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
}


function calcularDiferenciaHoras(fechaInicio, fechaFin) {
    if (fechaInicio===null || fechaFin===null){
        return null
    }
    let inicio = moment(fechaInicio);
    let fin = moment(fechaFin);

    // Calcular la diferencia en minutos entre las dos fechas
    let diferenciaMinutos = fin.diff(inicio, 'minutes');

    // Convertir la diferencia de minutos a horas (como un número decimal)
    let diferenciaHoras = diferenciaMinutos / 60;

    return diferenciaHoras;
}


function calcularHorasNocturnas(momentoInicio, momentoFin) {

    if (momentoInicio === null || momentoFin === null){
        return null
    }
    // Convertir las cadenas de fecha en objetos Date
    let inicio = new Date(momentoInicio);
    let fin = new Date(momentoFin);

    // Crear objetos Date de referencia para las 22:00 y las 06:00 del día siguiente
    let momento22Referencia = new Date(momentoInicio);
    momento22Referencia.setHours(22, 0, 0, 0);
    momento22Referencia.setHours(momento22Referencia.getHours() + 2);
    let momento06Referencia = new Date(momentoInicio);
    momento06Referencia.setDate(momento06Referencia.getDate() + 1);
    momento06Referencia.setHours(6, 0, 0, 0);
    momento06Referencia.setHours(momento06Referencia.getHours() + 2);
    let momento06ReferenciaMismoDia   = new Date(momentoInicio);
    momento06ReferenciaMismoDia.setHours(6, 0, 0, 0);
    momento06ReferenciaMismoDia.setHours(momento06ReferenciaMismoDia.getHours() + 2);

         
    //console.log(inicio,fin,momento22Referencia,momento06Referencia)
    // Verificar en qué horario se encuentra cada momento y calcular las horas nocturnas en consecuencia
    if (moment(inicio).isSameOrAfter(moment(momento22Referencia)) && moment(fin).isSameOrBefore(moment(momento06Referencia))){
        //todo el tiempo se ha trabajado en noctura
        return calcularDiferenciaHoras(inicio,fin)
    }else if(moment(inicio).isSameOrBefore(moment(momento22Referencia)) && moment(fin).isSameOrAfter(moment(momento22Referencia)) && moment(fin).isSameOrBefore(moment(momento06Referencia))){
        //se ha empezado sin noctura pero se finaliza en noctura
        return calcularDiferenciaHoras(momento22Referencia,fin)
    }else if(moment(inicio).isSameOrAfter(moment(momento22Referencia)) && moment(inicio).isSameOrBefore(moment(momento06Referencia)) && moment(fin).isSameOrAfter(moment(momento06Referencia))){
        //se ha empezado sin noctura pero se finaliza en noctura
        return calcularDiferenciaHoras(inicio,momento06Referencia)
    }else if(moment(inicio).isSameOrBefore(moment(momento06ReferenciaMismoDia)) && moment(fin).isSameOrBefore(moment(momento22Referencia))){
        //se ha empezado sin noctura pero se finaliza en noctura
        return calcularDiferenciaHoras(inicio,momento06ReferenciaMismoDia)
    }else{
        return 0
    }

}


function calcularHorasDiurnas(horasTrabajadas, horasNocturnas) {

    if (!isNaN(horasTrabajadas) && !isNaN(horasNocturnas)){
        //console.log(horasTrabajadas,horasNocturnas,"diurnas",horasTrabajadas-horasNocturnas)
        return (horasTrabajadas-horasNocturnas)
    }else{
        return 0   
    }
}


function calcularHorasDescanso(descanso) {

    if (descanso !== null){
        const [hours, minutes] = descanso.split(':').map(Number); 
        // Convertir los minutos a una fracción de hora y sumar las horas
        const totalHours = hours + (minutes / 60);
        // Redondear el resultado a dos decimales
        const roundedTotalHours = Math.round(totalHours * 100) / 100;
        //console.log("DESCANSO",descanso,roundedTotalHours)
        return roundedTotalHours;
        
    }else{
        return 0   
    }
}



module.exports = {
    Calculos,
    ObtenerNombreMes,
    roundQuarterHour,
    calcularDiferenciaHoras,
    calcularHorasNocturnas,
    calcularHorasDiurnas,
    transformarDia,
    calcularHorasDescanso,
    transformarDia
}
