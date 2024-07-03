const express = require("express");
const moment = require("moment");
const axios = require("axios");
const bodyParser = require("body-parser");
const { getAvailability, getColaboratorDetail, getCounters } = require('./collaboratorUtils');
const { getVacacionesId,getProyecto,getDisponibilidadesMaster} = require('./otrasFunciones');
const {Calculos, ObtenerNombreMes,roundQuarterHour, calcularDiferenciaHoras, calcularHorasNocturnas,calcularHorasDiurnas,calcularHorasDescanso} = require('./calculos');
const Token = require('./token'); // Ruta al archivo token.js
const { HorasYAusenciasNoJustificadas, AusenciasJustificadas, ConstruccionTablaFinal, Contadores,VacacionesPeriodoSeleccionado } = require('./tablaFinal.js');
const {masColaboraders} = require('./masColaboradores.js')
const festivos = require('./festivos.json');


const app = express();
const port = process.env.PORT || 7777;

// Middleware para analizar los datos del cuerpo de la solicitud
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const endpoint = "https://people.grupoconstant.com";
const API_TOKEN = Token()



app.post("/calcularHoras", async (req, res) => {
    const departamento = req.body.departamento;
    const password = req.body.password;
    const desde = req.body.fechadesde;
    const mesNumero = (new Date(desde).getMonth());
    const nombreMes = ObtenerNombreMes(mesNumero).toUpperCase()
    const hasta = req.body.fechahasta;
    console.log(departamento)
    const festivosDepartamento = festivos.filter(item =>item.departamentoId==departamento)
    console.log(festivosDepartamento)
    if (password != "Beeple1234"){
        res.send("<h1>Contraseña incorrecta </h1>")
    }else{
    const headers = {
        'Content-Type': 'application/json',
        'Token': API_TOKEN
    };
    //Buscar el id del proyecto para despues filtrar
    const proyecto = await getProyecto(endpoint,headers,departamento)
    //console.log(proyecto)
    //Cargar el maestro de disponibilidades
    const disponibilidadesMaster = await getDisponibilidadesMaster(endpoint,headers)
    //console.log("proyecto",String(proyecto))
    //Saber los dias de diferencias entre desde y hasta
    const diasTotales = moment(hasta).diff(moment(desde), 'days') + 1
    
    if (proyecto){

        let i = 1; // Inicializar el contador para las páginas
        const maxPages = 1000; // Número máximo de páginas que se deben recuperar

        console.log("Empezar API Work hours", new Date())
        try {
            let allWorkHoursData = []; // Inicializar un array para almacenar todos los datos de horas trabajadas
            

            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

            while (i <= maxPages) {
                // Realizar la solicitud al servidor para obtener las horas trabajadas
                console.log(`${endpoint}/api/v1/admin/collaborators/worked_hours?filter[period][period_start_at]=${desde}&filter[period][period_end_at]=${hasta}&filter[status]=reported&page=${i}&page_items=500`);
                let workHoursResponse
                try {
                    workHoursResponse = await axios.get(`${endpoint}/api/v1/admin/collaborators/worked_hours?filter[period][period_start_at]=${desde}&filter[period][period_end_at]=${hasta}&filter[status]=reported&page=${i}&page_items=500`, {
                    headers: headers
                });
                }catch{
                    console.log("2do intento llamada API")
                    workHoursResponse = await axios.get(`${endpoint}/api/v1/admin/collaborators/worked_hours?filter[period][period_start_at]=${desde}&filter[period][period_end_at]=${hasta}&filter[status]=reported&page=${i}&page_items=500`, {
                        headers: headers
                    })
                       
                }
            
                // Agregar los datos devueltos al array allWorkHoursData
                allWorkHoursData = allWorkHoursData.concat(workHoursResponse.data.worked_hours);
            
                // Verificar si se devolvieron datos
                if (workHoursResponse.data.next === null) {
                    // Si no se devuelven datos, salir del bucle
                    break;
                }
            
                // Incrementar el contador de página
                i++;
            
                // Si el contador de página es múltiplo de 3, esperar 2 segundos
                // if (i % 3 === 0) {
                //     console.log('Esperando 2 segundos...');
                //     await delay(2000);
                // }
            }
            
            console.log("TERMINAMOS API Work hours", new Date())
            console.log("Filtramos horas del proyecto", new Date())

            //TRATAMIENTO DE LOS DATOS DE HORAS TRABAJADAS#####################################################
            //SOLO BUSCAMOS HORAS DEL DEPARTAMENTO SELECCIONADO################################################
            // Extraemos los datos de las worked_hours
            const workHoursData = allWorkHoursData;
            //console.log(workHoursData)
            //Filtramos los elementos que tienen el valor 'departamento' en el array item.enrolment.volunteer.departments_ids[0]==departamento
            //const workhoursDep = workHoursData.filter(item => (item.enrolment.volunteer.department_ids[0] == departamento && item.enrolment.cancelled === false));
            const workhoursDep = workHoursData.filter(item => (item.enrolment.cancelled === false && item.enrolment.team.project_id == String(proyecto)))
            console.log("TERMINAMOS filtrado horas del proyecto", new Date())
            console.log("Creamos un array con todos los datos formateados y agregamos otros", new Date())
            // Mapeamos los elementos filtrados para extraer solo algunos datos
            const workhoursFiltrados = workhoursDep.map(item => {
                const start = moment(item.confirmed_starts_at); // Momento de inicio
                const end = moment(item.confirmed_ends_at); // Momento de finalización
                const duration = moment.duration(end.diff(start)); // Duración entre el inicio y el final       
                const durationRounded = Math.floor(duration.asHours() * 4) / 4; // Redondear la duración al múltiplo más cercano de 0.25 por debajo
                let horaInicioRounded = (item.confirmed_starts_at != null) ? roundQuarterHour(item.confirmed_starts_at,"up") : null
                let horaFinalRounded = (item.confirmed_ends_at != null) ? roundQuarterHour(item.confirmed_ends_at,"down") : null
                let horasTrabajadas = calcularDiferenciaHoras(horaInicioRounded,horaFinalRounded)
                let horasNocturnas = calcularHorasNocturnas(horaInicioRounded,horaFinalRounded)
                let horasDiurnas = calcularHorasDiurnas(horasTrabajadas,horasNocturnas)
                let horasDescanso = calcularHorasDescanso(item.confirmed_break_duration)
                //Ajustes del total de horas trabajadas
                if(horasDiurnas>0 && horasNocturnas ===0){
                    horasDiurnas = horasDiurnas- horasDescanso
                }else if(horasNocturnas>0 && horasDiurnas ===0){
                    horasNocturnas = horasNocturnas- horasDescanso
                }else if(horasNocturnas>0 && horasDiurnas >0){
                    if(horasNocturnas>horasDescanso/2 && horasDiurnas>horasDescanso/2){
                        horasDiurnas = horasDiurnas- horasDescanso/2
                        horasNocturnas = horasNocturnas- horasDescanso/2
                    }
                }
                return {
                    "collaborator_id": item.enrolment.volunteer.id,
                    "collaborator_name": item.enrolment.volunteer.name,
                    "department_id":item.enrolment.volunteer.department_ids[0],
                    "shift_date": moment(item.shift.start_datetime).format('YYYY-MM-DD'),
                    "start_confirmed": item.confirmed_starts_at,
                    "end_confirmed": item.confirmed_ends_at,
                    "confirmed_absent": item.confirmed_absent,
                    "absence_reason": item.confirmed_absence_reason,
                    "choice_made": item.choice_made,
                    "duration_work": duration.asHours(),
                    "start_confirmed_rounded":horaInicioRounded,
                    "end_confirmed_rounded":horaFinalRounded,
                    "duration_work_night_hours":horasNocturnas,
                    "duration_work_day_hours":horasDiurnas,
                    "duration_break_hours":horasDescanso,
                    "duration_work_rounded":horasTrabajadas-horasDescanso,
                    //"duration_work_rounded": durationRounded 
                };
            });
            console.log("TERMINAMOS el crear un array con todos los datos formateados y agregamos otros", new Date())
            

            //Ahora deberíamos buscar todos los trabajadores que Son del mismo departamento
            //que estamos buscando pero que no tienen horas durante el periodo de tiempo seleccionado
            //Por ejemplo. Imaginemos que un trabajador tiene vacaciones todo ese periodo.
            //Debe salir en el listado aunque todo sean horas de vacaciones
            //Hay que considerar que sean trabajadores que no tengan fecha de baja 
            //o que si la tienen esté comprendida entre la fecha desde y hasta
            //lo hago todo en otro archivo (masColaboradores.js)
            console.log('Esperando 2 segundos...');
                    await delay(2000);
            console.log("INICIAMOS el añadir al array workhoursFiltrados todos los trabajadores que no tienen horas", new Date())
            if (true){
                //Lo desactivo porque en fedefarma siempre aparecen muchos mas trabajadores y no se porque???
                await masColaboraders(workhoursFiltrados,headers,endpoint,departamento,desde,hasta)
            }
            console.log("TERMINAMOS el añadir al array workhoursFiltrados todos los trabajadores que no tienen horas", new Date())
            console.log('Esperando 2 segundos...');
                    await delay(2000);
            
           
            // Objeto para realizar un seguimiento de los colaboradores únicos
            const uniqueCollaborators = {};
            // Array para almacenar los colaboradores únicos
            const uniqueCollaboratorsArray = [];

         
            console.log("Montar objeto workhoursFiltrados", new Date())
            let contador = 0
            for (const item of workhoursFiltrados) {
                if (!uniqueCollaborators[item.collaborator_id]) {
                    if (contador % 20 === 0) {
                        console.log('Esperando 4 segundos...');
                        await delay(10000);
                    }
                    contador = contador + 1
                    uniqueCollaborators[item.collaborator_id] = item.collaborator_name;
                    // Utilizamos async/await dentro de una función asincrónica
                    const availabilityPromise = getAvailability(headers, endpoint, item.collaborator_id, desde, hasta);
                    const collaboratorDetailPromise = getColaboratorDetail(headers, endpoint, item.collaborator_id);
                    const collaboratorCountersPromise = getCounters(headers, endpoint, item.collaborator_id);
                    
                    // Espera a que se resuelvan ambas promesas antes de agregarlas a uniqueCollaboratorsArray
                    console.log("    API Disponibilidades colaborador", item.collaborator_id, new Date())
                    let availability
                    try{
                        availability = await availabilityPromise;
                    }catch{
                        console.log("2do intento disponibilidades colaborador")
                        availability = await availabilityPromise;
                    }
                    console.log("    TERMINAMOS API Disponibilidades colaborador", item.collaborator_id, new Date())
                    console.log("    API Detalle colaborador colaborador", item.collaborator_id, new Date())
                    let collaboratorDetail
                    try{
                        collaboratorDetail = await collaboratorDetailPromise;
                    }catch{
                        console.log("2do intento detalles colaborador")
                        collaboratorDetail = await collaboratorDetailPromise;
                    }
                    console.log("    TERMINAMOS API Detalle colaborador", item.collaborator_id, new Date())
                    console.log("    API Contadores colaborador", item.collaborator_id, new Date())
                    let collaboratorCounters 
                    try{
                        collaboratorCounters = await collaboratorCountersPromise;
                    }catch{
                        console.log("2do intento contadores colaborador")
                        collaboratorCounters = await collaboratorCountersPromise;
                    }
                    console.log("    TERMINAMOS API Contadores colaborador", item.collaborator_id, new Date())


                    uniqueCollaboratorsArray.push({
                        "collaborator_id": item.collaborator_id,
                        "collaborator_name": item.collaborator_name,
                        "availabilities": availability,
                        "collaborator_dninie":collaboratorDetail.dniNie,
                        "collaborator_detail": collaboratorDetail,
                        "collaborator_counters":collaboratorCounters,
                        "collaborator_contract_type":collaboratorDetail.collaborator_type_contract
                    });
                    
                }
            }
            console.log("TERMINAMOS Montar objeto workhoursFiltrados", new Date())

       
            //Obtener el Id de la disponibilidad vacaciones. En otro tenant mirar si se escribe igual
            const vacacionesId = await getVacacionesId(headers,endpoint,"Vacaciones")
            //console.log(vacacionesId)
            //vacacionesId toma valor numerico si se encuentra, 
            //###################################################### AQUI EMPIEZA LA FIESTA ####################################################
            //Construcción de variable dinámicas de fechas para la tabla
            // Objeto para realizar un seguimiento de las fechas
            const datesObject = {};
            // Construimos el rango de fechas entre desde y hasta
            const currentDate = moment(desde);
            while (currentDate.isSameOrBefore(hasta)) {
                datesObject[currentDate.format('YYYY-MM-DD')] = '';
                currentDate.add(1, 'day');
            }

            let tablaFinal = [];
            //Construcción de la tabla final--> Devuelve tablaFinal con una primera de versión de datos vacíos
            console.log("Construccioin tabla final")
            ConstruccionTablaFinal(tablaFinal, uniqueCollaboratorsArray, datesObject,diasTotales,desde,hasta,festivosDepartamento)
                        
            //hago esto para que me quite los errores de todos los trabajadore que son administradores
            //tablaFinal = tablaFinal.filter(item => item.collaborator_cod_net4 !== null);
            tablaFinal = tablaFinal.filter(item => item.collaborator_cod_net4 !== null);
            //tablaFinal = tablaFinal.filter(item => item.collaborator_cod_net4 !== undefined);
            //console.log("Pintar tablar final",tablaFinal)
            
            // Calcular Ausencia y HorasNO justificadas--> Devuelve tablaFinal con las horas trabajadas y Ausencias NO Justificadas
            console.log("Horas y ausencias no justificadas")
            HorasYAusenciasNoJustificadas(tablaFinal,workhoursFiltrados);
            //res.send(tablaFinal)
            // Calcular Ausencia justificadas --> Devuelve tablaFinal con las Aunsecias Justificadas
            console.log("Ausencias Justificadas")
            AusenciasJustificadas(tablaFinal,uniqueCollaboratorsArray,disponibilidadesMaster);
    
            //Calculos en tabla final --> Realiza calculos entre columnas y devuelve tablaFinal
            console.log("Calculos en tabla final")
            Calculos(tablaFinal)
        
            //Añadir contadores a la tablaFinal
            console.log("Contadores añadir a tabla final")
            Contadores(tablaFinal,uniqueCollaboratorsArray,nombreMes)

            //Calcular las vacaciones disfrutadas dentro del periodo seleccionado y poner en 
            //tabla final. En la columna que habiamos creado llamada "dias_vacaciones_periodo"
            console.log("Calcular vacaciones dentro del periodo de fechas seleccionado")
            VacacionesPeriodoSeleccionado(tablaFinal,uniqueCollaboratorsArray,vacacionesId,desde,hasta)

                //Ordenamos tablaFinal
            tablaFinal.sort((a, b) => {
                return b.horas_totales - a.horas_totales; // Orden ascendente
            });

            //######################################### DEVOLUCION EN FORMATO TABLA ####################################################
            // Devolver el resultado en formato de tabla HTML
            if (true) {
               // Objeto para mapear nombres de columnas a colores
                const columnColors = {
                    "collaborator_id": "lightblue", 
                    "collaborator_name": "lightblue", 
                    "collaborator_fecha_alta": "lightblue",
                    "collaborator_fecha_baja": "lightblue",
                    "collaborator_horas_contrato_dia": "lightblue",
                    "collaborator_horas_contrato_semana": "lightblue",
                    "collaborator_jornada": "lightblue",
                    "collaborator_cod_net4": "lightblue",
                    "collaborator_dni_nie": "lightblue",
                    "collaborator_contract_type": "lightblue",
                    "horas_totales": "#D384C1", 
                    "horas_nocturnas": "#F2B9E6", 
                    "horas_diurnas": "#F2B9E6", 
                    "horas_sabado": "#F2B9E6", 
                    "horas_domingo": "#F2B9E6",
                    "max_horas_complementarias": "#C6E8DB", 
                    "total_ANJ": "#D384C1", 
                    "dias_vacaciones_periodo":"#FFFFE0",
                    "total_AJ": "#D384C1", 
                    "collaborator_horas_teoricas": "#D384C1",
                    //"collaborator_total_horas":"#C6E8DB",
                    "collaborator_diferencia_horas":"#C6E8DB",
                    "collaborator_h_complementarias":"#C6E8DB",
                    "collaborator_h_extras":"#C6E8DB",
                    "Vacaciones": "#FFFFE0", 
                };

                // Construir la tabla HTML de respuesta
                let htmlResponse = '<table border="1" class="table">';
                //let htmlResponse = '<table class="table table-bordered table-striped" style="color: black;">';

                htmlResponse += '<th>Col.ID</th><th>Col.Name</th><th>Alta</th><th>Baja</th><th>H.dia</th><th>H.Sem.</th><th>Jornada</th><th>Cod.Net.4</th><th>DNI</th><th>T.Contrato</th>'; // Encabezados de columna

                // Encabezados de columna para las fechas
                for (const dateKey in datesObject) {
                    htmlResponse += `<th>${dateKey}</th>`;
                }
                // Agregar encabezado para Horas Totales
                htmlResponse += '<th>Horas Totales</th>';
                htmlResponse += '<th>H. Noct.</th>';
                htmlResponse += '<th>H. Diur.</th>';
                htmlResponse += '<th>H. Sab.</th>';
                htmlResponse += '<th>H. Dom.</th>';
                htmlResponse += '<th>Max.H.Compl.</th>';
                htmlResponse += '<th>Total ANJ(#)</th>';
                htmlResponse += '<th>VAC periodo (días)</th>';
                htmlResponse += '<th>Total AJ(Hrs)</th>';
                htmlResponse += '<th>Horas Teóricas</th>';
                //htmlResponse += '<th>TOTAL (Hs + AJ)</th>';
                htmlResponse += '<th>DIFF.</th>';
                htmlResponse += '<th>H.COMP.</th>';
                htmlResponse += '<th>H.EXT.</th>';
                htmlResponse += '<th>VAC 2024 (días)</th>';
                htmlResponse += '</tr>'; // Fin de fila de encabezados

                // Iterar sobre los datos de la tabla final para construir las filas de la tabla HTML
                tablaFinal.forEach(row => {
                    htmlResponse += '<tr>';
                    // Iterar sobre las columnas de la fila
                    for (const key in row) {
                        if (row.hasOwnProperty(key)) {
                            // Verificar si la columna actual está en el objeto de colores
                            const color = columnColors[key] || ''; // Si no hay color definido, se usará un color vacío
                            // Comprobar si la celda está vacía
                            const isEmpty = row[key] === '';
                            // Si la celda está vacía, asignar color gris oscuro
                            const cellColor = isEmpty ? 'darkgray' : color;
                            // Agregar estilo de fondo a la celda si hay un color definido
                            const style = cellColor ? `style="background-color: ${cellColor}"` : '';
                            // Agregar celda con el estilo
                            htmlResponse += `<td ${style}>${row[key]}</td>`;
                        }
                    }
                    //htmlResponse += `<td><button onclick="alert('Haz hecho clic en el botón de ${row['collaborator_name']}')">Botón</button></td>`;
                    //htmlResponse += `<td><button class='btn' onclick="alert()">INFORMACIÓN</button></td>`;
                    htmlResponse += '</tr>'; // Fin de fila
                });

                htmlResponse += '</table>'; // Fin de tabla

                // Agrega un enlace para descargar el archivo Excel
                //htmlResponse += '<a href="/descargarExcel">Descargar Excel</a>';

                // Enviar la respuesta HTML

                res.send(htmlResponse);
     
            }else{
                //res.send(uniqueCollaboratorsArray);
                res.send(workhoursFiltrados);
                //res.send(allWorkHoursData)
                //res.send(tablaFinal)
            }


    
        } catch (error) {
            // En caso de error, enviar un mensaje de error al cliente
            res.status(500).send(error);
        }
    }else{
        res.send("<h1>No se pudo obtener el proyecto</h1>")
    }
}
});

app.post("/obtenerDepartamentos", async (req, res) => {
    const headers = {
        'Content-Type': 'application/json',
        'Token': API_TOKEN
    };

    try {
        const response = await axios.get(`${endpoint}/api/v1/admin/departments`, { headers });
        const departments = response.data.departments
        //console.log(departments)
        res.json(departments); // Devolver los datos de los departamentos como JSON
    } catch (error) {
        res.status(500).send('Error al obtener los departamentos');
    }
});



app.post("/festivos", (req, res) => {
    const departamento = req.query.departamento;

    // Filtra los festivos por el departamento si es necesario
    // Por ejemplo, si los festivos están almacenados en el archivo festivos.json
    // y quieres filtrarlos según el departamento
    const festivosDepartamento = festivos.filter(f => f.departamento_id === departamento);

    res.json(festivosDepartamento);
});





// Configuramos el servidor para servir archivos estáticos
app.use(express.static("./"));

app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});