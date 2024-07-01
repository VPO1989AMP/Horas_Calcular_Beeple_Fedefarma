const bodyParser = require("body-parser");
const moment = require("moment");
const {transformarDia} = require('./calculos');

function ConstruccionTablaFinal(tablaFinal, uniqueCollaboratorsArray,datesObject,diasTotales,desde,hasta,festivosDepartamento) {
    // Recorremos la tabla uniqueCollaboratorsArray que sabemos que tiene 1 único objeto con un id de colaborador
    // y partir de ella generamos la nueva tabla con los campos que necesitamos
    uniqueCollaboratorsArray.forEach(item => {
    // Inicializamos las horas totales como cero
    //console.log(item)
    // if (item.collaborator_id===89692){
    //     console.log("89692",item)
    // }
    let horasTotales = 0;
    let horasNocturnas = 0;
    let horasDiurnas = 0;
    let maxHorasComplementarias =0
    maxHorasComplementarias = calcularHorasComplementarias(item,diasTotales,desde,hasta,festivosDepartamento)
    
    // Creamos un objeto para representar una fila de la tabla
        const filaTabla = {
            "collaborator_id": item.collaborator_id,
            "collaborator_name": item.collaborator_name,
            "collaborator_fecha_alta": item.collaborator_detail["Fecha Alta"], 
            "collaborator_fecha_baja": item.collaborator_detail["Fecha baja"], 
            "collaborator_horas_contrato_dia": item.collaborator_detail["Horas contrato dia"], 
            "collaborator_horas_contrato_semana": item.collaborator_detail["Horas contrato semana"], 
            "collaborator_jornada": item.collaborator_detail["Jornada"], 
            "collaborator_cod_net4": item.collaborator_detail["Código trabajador NET4"], 
            "collaborator_dni_nie": item.collaborator_dninie, 
            "collaborator_contract_type": item.collaborator_contract_type, 
            ...datesObject,
            "horas_totales": horasTotales, 
            "horas_nocturnas":horasNocturnas,
            "horas_diurnas":horasDiurnas,
            "horas_sabado":0,
            "horas_domingo":0,
            "max_horas_complementarias":maxHorasComplementarias,
            "total_ANJ": 0,
            "dias_vacaciones_periodo":0,
        };
        // Agregamos esta fila a la tabla final
        tablaFinal.push(filaTabla);
    });
}
 

function HorasYAusenciasNoJustificadas(tablaFinal,workhoursFiltrados){
    for (const item of tablaFinal) {
        let id;
        let horasTotales = 0
        let horasNocturnas = 0
        let horasDiurnas = 0
        let horasSabado = 0
        let horasDomingo = 0
        let totalANJ = 0
        //BUSQUEDA DE HORAS TRABAJADAS + AUSENCIAS NO JUSTIFICADAS
        for (const key in item) {
            if (key == "collaborator_id") {
                id = item[key];
            //}else if (key !== "collaborator_name" && key !== "horas_diurnas" && key !== "horas_nocturnas" && key !== "horas_totales" && key !== "total_ANJ" && key !== "collaborator_fecha_alta" && key !== "collaborator_fecha_baja" && key !== "collaborator_horas_contrato_dia" && key !== "collaborator_jornada" && key !== "collaborator_cod_net4") {
            }else if (!isNaN(new Date(key).getTime())){    
                const workhour = workhoursFiltrados.find(entry =>{ 
                    return(
                        entry.collaborator_id == id && entry.shift_date == key
                    )
                });
                //console.log(key)
                //console.log(workhour)
                if (workhour) {
                    if (!isNaN(workhour.duration_work_rounded) && workhour.duration_work_rounded != null ) {
                        item[key] = workhour.duration_work_rounded;
                        horasTotales = horasTotales + workhour.duration_work_rounded
                        horasDiurnas = horasDiurnas + workhour.duration_work_day_hours
                        horasNocturnas = horasNocturnas + workhour.duration_work_night_hours
                        if ((new Date(key)).getDay()===6){
                            horasSabado = horasSabado + workhour.duration_work_rounded
                            //console.log("SABADO",key,horasSabado)
                        }
                        if ((new Date(key)).getDay()===0){
                            horasDomingo = horasDomingo +  workhour.duration_work_rounded
                            //console.log("DOMINGO",key,horasDomingo)
                        }
                    } else {
                        //console.log("paso")
                        item[key] = "ANJ"
                        totalANJ = totalANJ +1
                    }
                }
                
            }
        }
        // Actualizamos valor de horas y de ANJ
        item["horas_totales"] = horasTotales.toFixed(2);
        item["horas_nocturnas"] = horasNocturnas.toFixed(2);
        item["horas_diurnas"] = horasDiurnas.toFixed(2);
        item["horas_sabado"] = horasSabado.toFixed(2);
        item["horas_domingo"] = horasDomingo.toFixed(2);
        item["total_ANJ"] = totalANJ
    }    
}

function AusenciasJustificadas(tablaFinal,uniqueCollaboratorsArray,disponibilidadesMaster){
    for (const item of tablaFinal) {
        let totalAJ = 0
        let jornada = item["collaborator_jornada"];
        let jornadaArray = (jornada!==null) ? jornada.split("-") : null
        //BUSQUEDA DE AUSENCIAS JUSTIFICADAS
        for (const key in item) {
            if (key == "collaborator_id") {
                id = item[key];
            }else if ( key == "collaborator_horas_contrato_dia") {
                horasDia =  parseFloat(item[key])
            }else if (!isNaN(new Date(key).getTime())){ 
                let dia = moment(key)
                let ausenciasJustificadas = {};
                for (const j of uniqueCollaboratorsArray) {
                    if (j.collaborator_id == id) {
                        for (const z of j.availabilities) {
                            // Convertir las fechas de availabilities a objetos de Moment.js 
                            const startsAtMoment = moment(z.starts_at);
                            const endsAtMoment = moment(z.ends_at);
                            if (dia.isSameOrAfter(startsAtMoment, 'day') && dia.isSameOrBefore(endsAtMoment, 'day')) {
                                ausenciasJustificadas = z;
                            }
                        }
                    }
                }
                if (Object.keys(ausenciasJustificadas).length !== 0) {
                        //Buscar el nombre abreviado de la ausencia
                        let nickNameAusencia = disponibilidadesMaster.find(item => item.id === ausenciasJustificadas.availability_type_id)?.abbreviation_i18n_attributes?.es;
                    if (ausenciasJustificadas.whole_day == true){
                        let fecha = new Date(key.toString());
                        let diaFecha = moment(fecha).day()
                        if (jornadaArray != null){
                            for (const dia of jornadaArray){
                                if (transformarDia(dia)===diaFecha){
                                    totalAJ = totalAJ + horasDia;
                                    //item[key] = (item[key] === "") ? "AJ-" + horasDia + "h" : item[key] + " // AJ-" + horasDia + "h";
                                    item[key] = (item[key] === "") ? `${nickNameAusencia}-${horasDia}h`: `${item[key]}//${nickNameAusencia} ${horasDia}h`;
                                }
                            }
                        }
                        //Lo quito de aqui y lo pongo solo si trabaja ese dia. Así no lia
                        //item[key] = (item[key] === "") ? "AJ-" + horasDia + "h" : item[key] + " // AJ-" + horasDia + "h";

                    } else {                             
                        const horaInicioString = ausenciasJustificadas.start_time;
                        const horaFinString = ausenciasJustificadas.end_time;
                        let fecha = new Date(key.toString());
                        let diaFecha = moment(fecha).day()
                        if (jornadaArray != null){
                            for (const dia of jornadaArray){
                                if (transformarDia(dia)===diaFecha){
                                    const horaInicio = moment(horaInicioString, "HH:mm");
                                    const horaFin = moment(horaFinString, "HH:mm");
                                    totalAJ = totalAJ + parseFloat(moment.duration(horaFin.diff(horaInicio)).asHours())
                                    item[key] = (item[key] === "") ? `${nickNameAusencia}-${parseFloat(moment.duration(horaFin.diff(horaInicio)).asHours())}h`:`${item[key]}//${nickNameAusencia}-${parseFloat(moment.duration(horaFin.diff(horaInicio)).asHours())}h`
                                }
                            }
                        }
                        //Lo quito de aqui y lo pongo solo si trabaja ese dia. Así no lia
                        //item[key] = (item[key] === "") ? "AJ-" + parseFloat(moment.duration(horaFin.diff(horaInicio)).asHours()) + "h" :  item[key] + "// AJ-" + parseFloat(moment.duration(horaFin.diff(horaInicio)).asHours()) + "h";
                    }
                }
            }

                
        }       
        // Actualizamos valor AJ
        item["total_AJ"] = totalAJ
    }
}

function Contadores(tablaFinal, uniqueCollaboratorsArray,nombreMes) {
    for (const item of tablaFinal) {
        let id = item.collaborator_id;
        let jornada = item.collaborator_jornada;
        //console.log(id,"passo")
        if (id !== "") {
            let collaborator = uniqueCollaboratorsArray.find(i => i.collaborator_id === id);
            //console.log(collaborator)
            if (collaborator) {
                let vacacionesLV = collaborator.collaborator_counters.find(j=>j.name=="Vacaciones (L-V) 2024");
                let vacacionesSD = collaborator.collaborator_counters.find(j=>j.name=="Vacaciones (S-D) 2024");
                if (jornada==="L-MA-MI-J-V" && vacacionesLV){
                    item["Vacaciones"] = vacacionesLV.automatic_value
                } else if(jornada ==="S-D" && vacacionesSD){
                    item["Vacaciones"] = vacacionesSD.automatic_value
                } else {
                    item["Vacaciones"] = "Error"
                }
            
                 

            }
        }
    }
}


function VacacionesPeriodoSeleccionado(tablaFinal,uniqueCollaboratorsArray,vacacionesId,desde, hasta){
    if (vacacionesId !==null){
        for (const item of tablaFinal){
            let jornada = item["collaborator_jornada"];
            let jornadaArray = (jornada!==null) ? jornada.split("-") : null
            let diasVac=0
            let disponibilidadesCol=uniqueCollaboratorsArray.find(i=>i.collaborator_id==item.collaborator_id)
            if (disponibilidadesCol) {
                // console.log("col",item.collaborator_id)
                // console.log("item",item)
                // console.log("dispo",disponibilidadesCol)
                for (const item2 of disponibilidadesCol.availabilities){
                    if(item2.availability_type_id==vacacionesId){
                        let fechaActual = moment(desde)
                        let inicio = moment(item2.starts_at)
                        let fin = moment(item2.ends_at)
                        //Hago un bucle para el periodo y voy mirando dia a dia
                        //si encuentre dentro del rango de fecha de la disponibilidad
                        // if (item.collaborator_id==209){
                        //     console.log(fechaActual,inicio,fin,hasta)
                        //     console.log((fechaActual.isSameOrAfter(inicio) && fechaActual.isSameOrBefore(fin) && fechaActual.isSameOrBefore(moment(hasta))))
                        // }
                        while (fechaActual.isSameOrBefore(moment(hasta))){
                            if (fechaActual.isSameOrAfter(inicio) && fechaActual.isSameOrBefore(fin)){
                                let fecha = new Date(fechaActual.toString());
                                let diaFecha = moment(fecha).day()
                                if (item2.whole_day){
                                    for (const dia of jornadaArray){
                                        if (transformarDia(dia)===diaFecha){
                                            diasVac = diasVac +1
                                            break
                                        }
                                    }
                                }else{
                                    for (const dia of jornadaArray){
                                        if (transformarDia(dia)===diaFecha){
                                            diasVac+=parseFloat(item2.duration_in_hours)/parseFloat(item.collaborator_horas_contrato_dia)
                                            break
                                        }
                                    }
                                }
                                
                            }
                            fechaActual.add(1, 'days');
                        }
                        // if (item.collaborator_id==209){
                        //     console.log(item2,diasVac)
                        // }
                    }
                }
            }
            item["dias_vacaciones_periodo"]=diasVac
            //console.log("idcol",item.collaborator_id,"diasVacaciones",diasVac)

        }
    }
}


function calcularHorasComplementarias(item, diasTotales, desde, hasta, festivosDepartamento) {
    // Método antiguo para calcular las horas max complementarias (comentado, no usado)
    /*
    if (false) {
        if (diasTotales > 0 && parseFloat(item.collaborator_detail["Horas contrato semana"]) && parseFloat(item.collaborator_detail["Horas contrato semana"]) < 40) {
            let calcMaxHorasComplementarias = (40 - parseFloat(item.collaborator_detail["Horas contrato semana"])) * (diasTotales / 7);
            return parseFloat(calcMaxHorasComplementarias.toFixed(2));
        } else {
            return 0;
        }
    }
    */

    let alta = item.collaborator_detail['Fecha Alta'] ? moment(item.collaborator_detail['Fecha Alta']) : null;
    let baja = item.collaborator_detail['Fecha baja'] ? moment(item.collaborator_detail['Fecha baja']) : null;

    //console.log("Logica de saber que fechas comprenden lo teórico");
    //console.log(moment(desde), moment(hasta), alta, baja, item.collaborator_detail["Jornada"], item.collaborator_detail["Horas contrato dia"], festivosDepartamento);
    let devolucionFuncionHorasComplementarias = 0
    // Calculo de horas máx complementarias
    if (alta !== null) {
        if (alta.isSameOrBefore(moment(desde)) && (baja === null || baja.isSameOrAfter(moment(hasta)))) {
            //console.log("1", moment(desde), moment(hasta));
            devolucionFuncionHorasComplementarias = devolverHorasComplementarias(moment(desde), moment(hasta), item.collaborator_detail["Jornada"], item.collaborator_detail["Horas contrato dia"], festivosDepartamento);
            return  devolucionFuncionHorasComplementarias
            //console.log(devolucionFuncionHorasComplementarias)
        } else if (alta.isSameOrAfter(moment(desde)) && alta.isSameOrBefore(moment(hasta)) && (baja === null || baja.isSameOrAfter(moment(hasta)))) {
            //console.log("2");
            devolucionFuncionHorasComplementarias = devolverHorasComplementarias(alta, moment(hasta), item.collaborator_detail["Jornada"], item.collaborator_detail["Horas contrato dia"], festivosDepartamento);
            return devolucionFuncionHorasComplementarias
            //console.log(devolucionFuncionHorasComplementarias)
        } else if (alta.isSameOrBefore(moment(desde)) && baja !== null && baja.isSameOrAfter(moment(desde)) && baja.isSameOrBefore(moment(hasta))) {
            //console.log("3");
            devolucionFuncionHorasComplementarias = devolverHorasComplementarias(moment(desde), baja, item.collaborator_detail["Jornada"], item.collaborator_detail["Horas contrato dia"], festivosDepartamento);
            return devolucionFuncionHorasComplementarias
            //console.log(devolucionFuncionHorasComplementarias)
        } else if (alta.isSameOrAfter(moment(desde)) && alta.isSameOrBefore(moment(hasta)) && baja !== null && baja.isSameOrAfter(moment(desde)) && baja.isSameOrBefore(moment(hasta))) {
            //console.log("4");
            devolucionFuncionHorasComplementarias = devolverHorasComplementarias(alta, baja, item.collaborator_detail["Jornada"], item.collaborator_detail["Horas contrato dia"], festivosDepartamento);
            return devolucionFuncionHorasComplementarias
            //console.log(devolucionFuncionHorasComplementarias)
        } else {
            //console.log("5");
            return 0;
        }
    }
    return 0;  // Si alta es null
}

function devolverHorasComplementarias(inicio, fin, jornada, horasDias, festivosDepartamento) {
    console.log("Dentro de devolverHorasComplementarias");
    // inicio y fin son fechas moment
    // jornada es un string tipo "L-MA-MI-J-V" o "S-D"
    // horasDias son las horas que tiene el trabajador por contrato al día
    // festivosDepartamento es un array de objetos que indica los festivos del departamento
    
    let horasDevolver = 0;
    let fecha = moment(inicio);  // Asegúrate de que 'inicio' sea una fecha válida para Moment
    let soloFestivos = jornada === "S-D";
    while (fecha.isSameOrBefore(fin)) {  // Asegúrate de que 'fin' sea una fecha válida para Moment
        
        let diaFecha = fecha.day();
        let diaFestivo = festivosDepartamento[0].festivos.includes(fecha.format('YYYY-MM-DD'));

        if ((diaFecha === 6 || diaFecha === 0) && soloFestivos && diaFestivo) {
            // Trabaja fines de semana y festivos
            horasDevolver += parseFloat(horasDias);
            //console.log(horasDias)
            
        } else if ((diaFecha === 1 || diaFecha === 2 || diaFecha === 3 || diaFecha === 4 || diaFecha === 5 ) && !soloFestivos && !diaFestivo) {
            // Trabaja de lunes a viernes (no festivos)
            horasDevolver += parseFloat(horasDias)
            //console.log(horasDias)

        }

        fecha.add(1, 'days');  // Incrementar la fecha al siguiente día
    }
    horasDevolver=parseFloat(horasDevolver*(30/100)).toFixed(2)
    return (horasDevolver);
}



module.exports={
    HorasYAusenciasNoJustificadas,
    AusenciasJustificadas,
    ConstruccionTablaFinal,
    Contadores,
    VacacionesPeriodoSeleccionado
};