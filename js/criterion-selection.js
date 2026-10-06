// Выбор пар для будущего сервера генерации. К интерфейсу прототипа не подключён.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CriterionSelection = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function fail(code, message) {
    var error = new Error(message);
    error.code = code;
    throw error;
  }

  function shuffle(values, random) {
    var result = values.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) {
        fail('INVALID_RANDOM', 'Источник случайности должен возвращать число от 0 включительно до 1.');
      }
      var j = Math.floor(value * (i + 1));
      var temporary = result[i];
      result[i] = result[j];
      result[j] = temporary;
    }
    return result;
  }

  // Вход: коды компетенций, записи criteria и записи criterion_competencies из JSON.
  // Проверку специализации и технологий выполняет вызывающий сервер до генерации.
  function selectPairs(competencyCodes, criteria, links, random) {
    random = random || Math.random;
    if (typeof random !== 'function') fail('INVALID_RANDOM', 'Источник случайности должен быть функцией.');
    if (!Array.isArray(competencyCodes) || competencyCodes.length < 1 || competencyCodes.length > 3 ||
        competencyCodes.some(function (code) { return typeof code !== 'string' || !code; }) ||
        new Set(competencyCodes).size !== competencyCodes.length) {
      fail('INVALID_SELECTION', 'Выберите от одной до трёх разных компетенций.');
    }
    if (!Array.isArray(criteria) || !Array.isArray(links)) {
      fail('INVALID_CATALOG', 'Критерии и связи должны быть массивами.');
    }
    var activeCriteria = new Map();
    criteria.forEach(function (criterion) {
      if (!criterion || criterion.active !== true) return;
      if (typeof criterion.code !== 'string' || !criterion.code ||
          !Number.isInteger(criterion.version) || criterion.version < 1) {
        fail('INVALID_CATALOG', 'Активный критерий должен иметь код и положительную версию.');
      }
      if (activeCriteria.has(criterion.code)) {
        fail('MULTIPLE_ACTIVE_VERSIONS', 'У кода критерия должна быть одна активная версия: ' + criterion.code);
      }
      activeCriteria.set(criterion.code, criterion);
    });
    var candidates = new Map();
    competencyCodes.forEach(function (code) { candidates.set(code, []); });
    links.forEach(function (link) {
      if (!link || link.active !== true || !candidates.has(link.competency_code)) return;
      var criterion = activeCriteria.get(link.criterion_code);
      if (!criterion || criterion.version !== link.criterion_version) return;
      var list = candidates.get(link.competency_code);
      // Дубликат связи не увеличивает вероятность её выбора.
      if (list.indexOf(criterion.code) < 0) list.push(criterion.code);
    });
    competencyCodes.forEach(function (code) {
      candidates.set(code, shuffle(candidates.get(code), random));
    });
    var owners = new Map();
    function assign(competencyCode, visitedCriteria) {
      var options = candidates.get(competencyCode);
      for (var i = 0; i < options.length; i++) {
        var criterionCode = options[i];
        if (visitedCriteria.has(criterionCode)) continue;
        visitedCriteria.add(criterionCode);
        var previousOwner = owners.get(criterionCode);
        if (!previousOwner || assign(previousOwner, visitedCriteria)) {
          owners.set(criterionCode, competencyCode);
          return true;
        }
      }
      return false;
    }
    shuffle(competencyCodes, random).forEach(function (code) {
      if (!assign(code, new Set())) {
        fail('NO_COMPLETE_MATCHING', 'Для выбранных компетенций нельзя собрать полный набор разных критериев.');
      }
    });
    var assignments = new Map();
    owners.forEach(function (competencyCode, criterionCode) {
      assignments.set(competencyCode, criterionCode);
    });
    return competencyCodes.map(function (competencyCode) {
      var criterion = activeCriteria.get(assignments.get(competencyCode));
      return {
        competency_code: competencyCode,
        criterion_code: criterion.code,
        criterion_version: criterion.version
      };
    });
  }

  return { selectPairs: selectPairs };
}));
