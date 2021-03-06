(function (window) {
  window.extractData = function () {
    var ret = $.Deferred();
    console.log(ret);

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart) {
      console.log(smart);
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
          type: 'Observation',
          query: {
            code: {
              $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
            }
          }
        });
        var conditions = smart.patient.api.fetchAll({
          type: 'Condition'
        });

        $.when(pt, obv, conditions).fail(onError);

        $.when(pt, obv, conditions).done(function (patient, obv, conditions) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'), '8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'), '8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.age = calculateAge(p.birthdate);
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined') {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          p.conditions = conditions;

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient() {
    return {
      fname: { value: '' },
      lname: { value: '' },
      gender: { value: '' },
      birthdate: { value: '' },
      height: { value: '' },
      systolicbp: { value: '' },
      diastolicbp: { value: '' },
      ldl: { value: '' },
      hdl: { value: '' },
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function (observation) {
      var BP = observation.component.find(function (component) {
        return component.code.coding.find(function (coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
      typeof ob.valueQuantity != 'undefined' &&
      typeof ob.valueQuantity.value != 'undefined' &&
      typeof ob.valueQuantity.unit != 'undefined') {
      return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  function calculateAge(birthdate) {
    if (typeof birthdate != 'Date') {
      birthdate = new Date(birthdate);
    }
    var ageDifMs = Date.now() - birthdate.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  window.drawVisualization = function (p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#age').html(p.age);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#conditions').html(p.conditions);
  };

  window.displayConditions = function (c) {
    const conditionDiv = document.querySelector('div.conditions');
    conditionTable = document.createElement('table');

    c.sort((a,b) => (a.dateRecorded <= b.dateRecorded) ? 1 : -1);
    c.forEach(condition => {
      let conditionRow = document.createElement('tr');
      let conditionName = document.createElement('td');
      let dateRecorded = document.createElement('td');

      conditionName.innerText = condition.code.text;
      dateRecorded.innerText = condition.dateRecorded;

      conditionRow.append(dateRecorded, conditionName);

      let codes = condition.code.coding;
      codes.forEach(code => {
        let codeData = document.createElement('td');
        codeData.innerText = code.code + " (" + code.system + ")";
        conditionRow.append(codeData);
      });

      let conditionText = document.createElement('td');
      conditionText.innerHTML = condition.text.div;

      //conditionRow.append(conditionText);
      conditionTable.append(conditionRow);
      conditionDiv.append(conditionTable);
    });
  }

})(window);
