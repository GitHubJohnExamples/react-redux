define(['file-saver', 'jsreport', 'ojs/ojcore', 'knockout', 'utils', 'jquery', 'jstree', 'lang/lang.ge', 'lang/lang.en', 'lang/lang.fr', 'lang/lang.sp',
    'ojs/ojrouter', 'ojs/ojknockout', 'ojs/ojpagingcontrol', 'ojs/ojpagingcontrol-model', 'ojs/ojbutton',
    'libs/jsTree/jstree', 'ojs/ojselectcombobox', 'ojs/ojdialog', 'ojs/ojinputnumber', 'jquery-ui', 'knockout-postbox'
],
        function (fs, jsreport, oj, ko, utils, $)
        {
            function PeopleViewModel() {
                //hide start loading indicator
                $("#loadIndicatorStart").hide();

                var self = this;
                //comment and uncomment to toggle dev and prod environment

                //test environment
                var solrCore = "EntityTestCore";
                //prod environment
//                var solrCore="EntityProdCore";

                self.peopleLayoutType = ko.observable('peopleCardLayout');
                self.allPeople = ko.observableArray([]);
                self.ready = ko.observable(false);
                self.selectPrintOption = ko.observable("");

                var AJAXurl;
                var isHidden = false;

                function urlEncodeComponent(url) {
                    return encodeURIComponent(url)
                            .replace(/!/g, '%21')
                            .replace(/'/g, '%27')
                            .replace(/\(/g, '%28')
                            .replace(/\)/g, '%29')
                            .replace(/\*/g, '%2A');
//                            .replace(/%20/g, '+');
                }

                //Query Parameters
                self.nameSearch = ko.observable('');
                self.url = ko.observable('/solr/' + solrCore + '/select?indent=on&wt=json');
                self.start = ko.observable(0);
                self.rows = ko.observable(48);
//                self.highlightField = ko.observable('&hl.fl=nam_comp_name&hl.simple.pre=<span class="highlight">&hl.simple.post=</span>&hl=on');
//                var hlFl = "&hl.fl=";
                var hlFl = urlEncodeComponent("nam_comp_name");
//                var hlSimplePre = "&hl.simple.pre=";
                var hlSimplePre = urlEncodeComponent('<span class="highlight">');
//                var hlSimplePost = "&hl.simple.post=";
                var hlSimplePost = urlEncodeComponent("</span>");
//                var hl = "&hl=";
                var hl = urlEncodeComponent("on");

//                self.groupField = ko.observable('&group.cache.percent=100&group.field=ent_id&group.ngroups=true&group.truncate=true&group=true');
//                var groupCachePercent = "&group.cache.percent=";
                var groupCachePercent = urlEncodeComponent("100");
//                var groupField_ = "&group.field=";
                var groupField = urlEncodeComponent("ent_id");
//                var groupNgroups = "&group.ngroups=";
                var groupNgroups = urlEncodeComponent("true");
//                var groupTruncate = "&group.truncate=";
                var groupTruncate = urlEncodeComponent("true");
//                var group_ = "&group=";
                var group = urlEncodeComponent("true");

//                self.facetField = ko.observable('&facet.field=add_country&facet.field=program_name&facet.field=ent_typeTree&facet.field=ent_typeName&facet=on');
//                var facetField = "&facet.field=";
                var facetFieldAddCountry = urlEncodeComponent("add_country");
                var facetFieldProgramName = urlEncodeComponent("program_name");
                var facetFieldEntTypeTree = urlEncodeComponent("ent_typeTree");
                var facetFieldEntTypeName = urlEncodeComponent("ent_typeName");
//                var facet_ = "&facet=";
                var facetContent = urlEncodeComponent("on");

//                self.scoreField = ko.observable('&fl=*,score');
                var scoreField = urlEncodeComponent('*,score');
//                var fl = "&fl=";
//                var flContent = urlEncodeComponent("*,score");

//                self.queryField = ko.observable('&q={!percentage t=QUERY_SIDE f=nam_comp_name}');
                var queryField = '{!percentage t=QUERY_SIDE f=nam_comp_name}';
//                var q = "&q=";
//                var qContent = urlEncodeComponent("{!percentage t=QUERY_SIDE f=nam_comp_name}");


                //Query Parameters for when returning from details page
                self.solrUrlReturn = ko.observable("");
                self.ajaxUrlReturn = ko.observable("");

                //Observable array for the HIGHLIGHTING data group
                self.allHighlighting = ko.observableArray([]);
                self.nameHighlight = ko.observableArray([]);

                //Observable array for Facets
                self.facetsCountries = ko.observableArray([]);
                self.facetsLists = ko.observableArray([]);
                self.facetsTypes = ko.observableArray([]);

                //variables to control data requests
                var nameBeforeUpdate = '';

                //Observable array for the filter tree
                self.filterTreeCountry = ko.observableArray([]);
                self.fqCountry = ko.observable("");
                self.filterTreeList = ko.observableArray([]);
                self.fqList = ko.observable("");
                self.filterTreeType = ko.observableArray([]);
                self.fqType = ko.observable("");
                //Observable for the comunication from the selection function "filteredAllPeople" to tree change events
                self.filterTreeObs = ko.observable("");

                //data tree observable array
                self.dataTree = ko.observableArray([]);

                //control access to tree method
                self.treeInit = ko.observable("");

                //nodes for OJ Tree
                self.nodeTreeCountry = ko.observableArray([]);
                self.nodeTreeList = ko.observableArray([]);

                //trees filter variables for remembering size
                self.treeHeight = ko.observable();
                self.treeListHeight = ko.observable();

                //Observable array for the filter to apear on the combobox when it is selcted
                self.comboboxSelectValue = ko.observable([]);
                self.comboObservable = ko.observable("");
                //Observable array to transport filter information from the tree change event to valueChangeHandleCombobox function
                self.arrSelCheckbox = ko.observableArray([]);

                //workers
                self.worker = new Worker('js/viewModels/worker.js');
                self.workerList = new Worker('js/viewModels/workerList.js');
                self.workerType = new Worker('js/viewModels/workerType.js');

                //store the worker result
                self.workerCountryResult = ko.observableArray([]);
                self.workerListResult = ko.observableArray([]);
                self.workerTypeResult = ko.observableArray([]);

                self.searched = ko.observableArray([]);
                self.keepFilter = false;

                //a ko observable to display the number of hits
                self.preCurrentHitsText = ko.observable("Currently");
                self.afterCurrentHitsText = ko.observable("out of");
                self.currentHitsValue = ko.observable("");
                self.hitsText = ko.observable("results");
                self.hitsValue = ko.observable("");
                self.numberMatches = ko.observable("");

                //a ko observable to display when there are no results
                self.noResults = ko.observable("");
                self.noResults.extend({rateLimit: {timeout: 100, method: "notifyWhenChangesStop"}});

                //For the number of entities found in one group
                self.found = ko.observable("Found");
                self.entities = ko.observable("Entities");

                //
                //For the Advanced Menu
                //
                //-------
                //Default definition for Advanced Search Observables 
                self.advancedSearchTitle = ko.observable("Advanced Search");
                self.defaultButton = ko.observable("Default");
                //-------
                //For the Calendar Text
                self.calendarSelectText = ko.observable("Calendar Filter");
                //For the Calendar Value
                self.calendarSelect = ko.observable(["all"]);
                self.fqCalendar = ko.observable("");
                self.calendarSelect.subscribe(function (newCalSel) {
                    var date = ko.dataFor(document.getElementById('dateTime')).calendar();
                    calendarFilterQuery(newCalSel[0], date);
                });
                //--------
                //For the Word Percentage Text
                self.wordPercentageText = ko.observable("Word Percentage");
                //For the Word Percentage Value
                self.wordPercentage = ko.observable(80);
                self.setInputWordPerNumberValueTo80 = function ()
                {
                    self.wordPercentage(80);
                };
                //-------
                //For the Phrase Percentage Text
                self.phrasePercentageText = ko.observable("Phrase Percentage");
                //For the Phrase Percentage Value
                self.phrasePercentage = ko.observable(80);
                self.setInputPhrasePerNumberValueTo80 = function ()
                {
                    self.phrasePercentage(80);
                };
                self.fqTotalPercentage = ko.observable("");
                //-------
                //For the Score Algorithm Text
                self.scoreAlgorithmText = ko.observable("Score Algorithm");
                //For the Score Algorithm Value
                self.scoreAlgorithm = ko.observable("QUERY_SIDE");
                //------
                //For the Words Distance Algorithm Text
                self.wordsDistanceAlgorithmText = ko.observable("Words Distance Algorithm");
                //self.wordsDistanceAlgorithmDefinition = ko.observable("Defines which algorithm must be used to calculate the distance between words");//this is for the help def
                //For the Words Distance Algorithm Value
                self.wordsDistanceAlgorithm = ko.observable("DA_LV");
                self.currentPhrasePercentageText;
                self.currentwordPercentage;
                self.currentScoreAlgorithm;
                self.currentWordsDistanceAlgorithm;
                self.currentCalendarSelect;
                //------
                checkCookie();
                utils.checkIPCookie;



                //
                //Bindings for the Languages
                //
                var countryFilterPanelTitle = "Country";
                var listFilterPanelTitle = "List";
                var typeFilterPanelTitle = "Type";
                self.percentageText = ko.observable("Percentage");
                self.countryText = ko.observable("Country");
                self.addressStatus = ko.observable("without address");
                self.countryStatus = ko.observable("worldwide");

                //Variable in order to specify to not translate the search page when the user is inside details page
                var translate = true;

                //Variable in order to specify when a translation occurs. Necessary for the tree.
                var treeTranslation = false;

                self.languageSel = ko.observable("english");
                self.langShortID = "en";
                self.languageSel.subscribeTo('languagesSearchPage');
//                console.log("subscribtioned to language: " + self.languageSel());
                self.languageSel.subscribe(function (selected) {
                    if (translate) {
                        var selectedLanguage = english.searchPage;
                        if (selected === "german") {
                            selectedLanguage = german.searchPage;
                            self.langShortID = "de";
                        } else if (selected === "english") {
                            selectedLanguage = english.searchPage;
                            self.langShortID = "en";
                        } else if (selected === "french") {
                            selectedLanguage = french.searchPage;
                            self.langShortID = "fr";
                        } else if (selected === "spanish") {
                            selectedLanguage = spanish.searchPage;
                            self.langShortID = "es";
                        }
                        //Get names countries in the selected language
                        //Translate search input placeholder
                        $('#searchText').attr("placeholder", selectedLanguage.basic.search);
                        //Translate Advanced Search
                        self.advancedSearchTitle(selectedLanguage.advancedSearch.title);
                        self.defaultButton(selectedLanguage.advancedSearch.defaultButton);
                        self.calendarSelectText(selectedLanguage.advancedSearch.calendarFilter.text);
                        self.wordPercentageText(selectedLanguage.advancedSearch.wordPercentage.text);
                        self.phrasePercentageText(selectedLanguage.advancedSearch.phrasePercentage.text);
                        self.scoreAlgorithmText(selectedLanguage.advancedSearch.scoreAlgorithm.text);
                        self.wordsDistanceAlgorithmText(selectedLanguage.advancedSearch.wordsDistanceAlgorithm.text);
                        //Translate Number Of Hits
                        self.hitsText(selectedLanguage.displayNumberResults.hits);
                        self.preCurrentHitsText(selectedLanguage.displayNumberResults.preCurrentHitsText);
                        self.afterCurrentHitsText(selectedLanguage.displayNumberResults.afterCurrentHitsText);
                        if (self.hitsValue() > 0 && self.hitsValue() !== "")
                            self.numberMatches(self.preCurrentHitsText() + " " + self.currentHitsValue() + " " + self.afterCurrentHitsText() + " " + self.hitsValue() + " " + self.hitsText());
                        //Translate Searched Entities Properties
                        self.percentageText(selectedLanguage.searchedEntityProperty.percentage);
                        self.countryText(selectedLanguage.searchedEntityProperty.country);
                        self.addressStatus(selectedLanguage.searchedEntityProperty.addressStatus);
                        self.countryStatus(selectedLanguage.searchedEntityProperty.countryStatus);
                        //Translation for "Found 2 Entities" inside the method "getNumFound()"
                        self.found(selectedLanguage.searchedEntityProperty.found);

                        //For translating the trees
                        self.keepFilter = false;
                        treeTranslation = true;
                        self.getTranslationCountries("");
                    }
                });

                function translateComboboxCountries() {
                    //checked tree values are equal with the filterTreeCountry values
                    //
                    //remove all content from the filterTreeCountry
                    self.filterTreeCountry([]);
                    //select all active nodes from the new translated country tree
                    var sel = $("#treeCountryLib").find("[aria-selected*='true']");
                    //fill the empty filterTreeContent with translated values
                    for (var i = 0; i < sel.length; i++) {
                        var name = "";
                        //match the id from the tree with the name from the result of ajax call, self.countriesTranslated
                        for (var l = 0; l < self.countriesTranslated.length; l++) {
                            if (sel[i].id === self.countriesTranslated[l].code) {
                                name = self.countriesTranslated[l].country;
                                for (var z = 0; z < selMetaCountryTree.length; z++) {
                                    if (sel[i].id === selMetaCountryTree[z].id) {
                                        selMetaCountryTree[z].name = name;
                                        break;
                                    }
                                }
                                break;
                            }
                        }

                        //when name is empty it means that sel[i].id is either "country" or "ẃorldwide"
                        if (name !== "") {
                            self.filterTreeCountry().push(name);
                        }
                    }
                    $("#combobox").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                    $("#combobox2").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                    self.processFilters();
                }


                self.countriesTranslated = new Array();
                self.getTranslationCountries = function (searchString) {
                    if (searchString === "") {
                        var fqContent = "countryCode:" + self.facetsCountries()[0];
                        for (var i = 2; i < self.facetsCountries().length; i = i + 2) {
                            if (self.facetsCountries()[i + 1] !== 0)
                                fqContent = fqContent + " OR " + "countryCode:" + self.facetsCountries()[i];
                        }
                        var url = "/solr/CountryCore/select?indent=on&wt=" + "json" + "&rows=" + "300" +
                                "&q=" + urlEncodeComponent("*:*") +
                                "&fq=" + urlEncodeComponent(fqContent);
                    } else {
                        //var search = urlEncodeComponent(searchString);
                        var url = "/solr/CountryCore/select?indent=on&wt=json&start=0&rows=48" +
                                "&q=" + urlEncodeComponent("*:*") +
                                "&fq=" + urlEncodeComponent("{!percentage f=all strategy=percentage t=QUERY_SIDE pw=0.6 ic=1 icp=0.6 alg=DA_LV}") +
                                urlEncodeComponent(searchString);
                    }
                    $.ajax({
                        method: "GET",
                        url: url,
                        dataType: "json",
                        success: function (countries) {
                            var result = new Array();
                            var translation = ko.dataFor(document.getElementById('select')).language();
                            translation = translation.replace(/([A-Z])/g, " $1");
                            translation = translation.charAt(0).toUpperCase() + translation.slice(1);

                            var docs = countries.response.docs;

                            if (searchString !== "") {
                                translation = "German";
                                for (var d = 0; d < docs.length; d++) {
                                    for (var key in docs[d]) {
                                        if (key !== "all") {
                                            if (docs[d][key].toLowerCase().includes(searchString.toLowerCase())) {
                                                translation = key;
                                            }
                                        }
                                    }
                                }
                            }

                            for (var i = 0; i < self.facetsCountries().length; i = i + 2) {
                                if (self.facetsCountries()[i + 1] !== 0) {
                                    for (var h = 0; h < docs.length; h++) {
                                        if (self.facetsCountries()[i] === docs[h].countryCode) {
                                            var country = docs[h][translation];
                                            var number = self.facetsCountries()[i + 1];
                                            var code = docs[h].countryCode;
                                            result.push({country, number, code});
                                            break;

                                        }
                                    }
                                    if (self.facetsCountries()[i] === "null") {
                                        var country = "Worldwide";
                                        var number = self.facetsCountries()[i + 1];
                                        var code = "null";
                                        result.push({country, number, code});
                                    }
                                }
                            }
                            self.countriesTranslated = result;
                            self.worker.postMessage(self.countriesTranslated);
                        },
                        error: function (error) {
                            if (error.responseJSON !== undefined)
                                console.log("Error in getting People data: " + error.responseJSON.error.msg);
                            else
                                console.log("Error in getting People data, " + "status:" + error.state());
                        }
                    });
                };

                //Comunication with header for the calendar values
                self.calendarSearch = ko.observable("");
                self.calendarSearch.subscribeTo('calendarSearchPage');
//                console.log("subscribtioned to calendar: " + self.calendarSearch());
                self.calendarSearch.subscribe(function (newCalendarVal) {
                    calendarFilterQuery(self.calendarSelect()[0], newCalendarVal);
                });

                function calendarFilterQuery(newCalSel, date) {
                    switch (newCalSel) {
                        case "all":
                            self.fqCalendar("");
                            break;
                        case "effective":
//                            self.fqCalendar("&fq=ent_validFrom:" + "[" + "*" + " TO " + date + "]" + "&fq=ent_validTo:" + "[" + date + " TO " + "*" + "]");
                            self.fqCalendar("ent_validFrom:" + "[" + "*" + " TO " + date + "]" + "&fq=ent_validTo:" + "[" + date + " TO " + "*" + "]");
                            break;
                        case "notYet":
//                            self.fqCalendar("&fq=ent_validFrom:" + "[" + date + " TO " + "*" + "]");
                            self.fqCalendar("ent_validFrom:" + "[" + date + " TO " + "*" + "]");
                            break;
                        case "noLonger":
//                            self.fqCalendar("&fq=ent_validTo:" + "[" + "*" + " TO " + date + "]");
                            self.fqCalendar("ent_validTo:" + "[" + "*" + " TO " + date + "]");
                            break;
                    }
                }

                //self.filterTreeObs.extend({rateLimit: {timeout: 300, method: "notifyWhenChangesStop"}});

                /**************************** FILTER FUNCTION ***************************/

                //limit the retrieve data for every search input
                self.nameSearch.extend({rateLimit: {timeout: 700, method: "notifyWhenChangesStop"}});

                //for counting the number of the page
                self.numberPage = ko.observable("");

                //Live scroll variables
                var stopScroll = false;
                var firstPage = true;

                //Retrieve data from SOLR for the tree filter
                self.nameQ = ko.observable("");


                //Store for type tree the selected node's id
                var selMetaCountryTree = new Array();
                var selMetaListTree = new Array();
                var selMetaTypeTree = new Array();



                function getSelIdByNameTree(selMetaTree, name) {
                    var id;
                    for (var i = 0; i < selMetaTree.length; i++) {
                        if (name === selMetaTree[i].name) {
                            id = selMetaTree[i].id;
                            selMetaTree.splice(i, 1);
                            break;
                        }
                    }
                    return id;
                }

                function getTreeIds(filterTree) {
                    var ids = new Array();
//                    for (var i = 0; i < filterTree.length; i++) {
//                        for (var x = 0; x < self.countriesTranslated.length; x++) {
//                            if (filterTree[i] === self.countriesTranslated[x].country) {
//                                ids.push(self.countriesTranslated[x].code);
//                            }
//                        }
//                    }
                    for (var i = 0; i < filterTree.length; i++) {
                        for (var x = 0; x < selMetaCountryTree.length; x++) {
                            if (filterTree[i] === selMetaCountryTree[x].name) {
                                ids.push(selMetaCountryTree[x].id);
                            }
                        }
                    }
                    return ids;
                }

                function removeMetaCountry(ids) {
                    for (var i = 0; i < ids.length; i++) {
                        for (var j = 0; j < selMetaCountryTree.length; j++) {
                            if (ids[i] === selMetaCountryTree[j].id) {
                                selMetaCountryTree.splice(j, 1);
                            }
                        }
                    }
                }

                function removeMetaType(ids) {
                    for (var i = 0; i < ids.length; i++) {
                        for (var j = 0; j < selMetaTypeTree.length; j++) {
                            if (ids[i] === selMetaTypeTree[j].id) {
                                selMetaTypeTree.splice(j, 1);
                            }
                        }
                    }
                }

                var clearCombobox = false;

                //Build all the Trees when Data is provided to the Country Observable Array
                var userSelectCountryNode = false;
                var userDeselectCountryNode = false;
                var userSelectListNode = false;
                var userDeselectListNode = false;
                var userSelectTypeNode = false;
                var userDeselectTypeNode = false;
                var treesInit = false;
                self.getSolrDataTree = function () {
                    $.getJSON(
                            self.url().toString() + "&rows=0" +
//                            self.groupField().toString() +
                            "&group.cache.percent=" + groupCachePercent + "&group.field=" + groupField + "&group.ngroups" + groupNgroups +
                            "&group.truncate=" + groupTruncate + "&group=" + group +
//                            self.facetField().toString() + 
                            "&facet.field=" + facetFieldAddCountry + "&facet.field=" + facetFieldProgramName +
                            "&facet.field=" + facetFieldEntTypeTree + "&facet.field=" + facetFieldEntTypeName +
                            "&facet=" + facetContent +
                            "&fq=" + urlEncodeComponent(self.fqTotalPercentage()) +
                            "&q=" + urlEncodeComponent(queryField) +
                            urlEncodeComponent(self.nameQ())).then(function (people) {
                        //Initiate trees one time only
                        if (treesInit !== true) {
                            $('#treeCountryLib').jstree({
                                "core": {
                                    "themes": {
                                        "variant": "large",
                                        "icons": false
                                    }
                                },
                                "plugins": ["checkbox", "search"],
                                "checkbox": {
                                    "three_state": false,
                                    "keep_selected_style": false
                                },
                                "search": {
                                    "case_insensitive": true,
                                    "show_only_matches": true
                                }
                            });
                            $("#treeCountryLib_input").keyup(function () {
                                var searchString = $(this).val();

                                if (/\S/.test(searchString) || searchString.length === 0) {
                                    var total = $('#treeCountryLib').find("#country").find("ul").children().length;
                                    $('#treeCountryLib').jstree('search', searchString);
                                    var now = total - $('#treeCountryLib').find(".jstree-hidden").length;
                                    if (now === total) {
                                        self.getTranslationCountries(searchString);
                                    }
                                }
                            });
                            $('#treeListLib').jstree({
                                "core": {
                                    "themes": {
                                        "variant": "large",
                                        "icons": false
                                    }
                                },
                                "plugins": ["checkbox", "search"],
                                "checkbox": {
                                    "three_state": false,
                                    "keep_selected_style": false
                                },
                                "search": {
                                    "case_insensitive": true,
                                    "show_only_matches": true
                                }
                            });
                            $("#treeListLib_input").keyup(function () {
                                var searchString = $(this).val();
                                $('#treeListLib').jstree('search', searchString);
                            });
                            $('#treeTypeLib').jstree({
                                "core": {
                                    "themes": {
                                        "variant": "large",
                                        "icons": false
                                    }
                                },
                                "plugins": ["checkbox", "search"],
                                "checkbox": {
                                    "three_state": false,
                                    "keep_selected_style": false
                                },
                                "search": {
                                    "case_insensitive": true,
                                    "show_only_matches": true
                                }
                            });
                            $("#treeTypeLib_input").keyup(function () {
                                var searchString = $(this).val();
                                $('#treeTypeLib').jstree('search', searchString);
                            });
                            treesInit = true;
                        }
                        //Store Solr results into the ko observables
                        self.facetsCountries(people.facet_counts.facet_fields.add_country);
                        self.facetsLists(people.facet_counts.facet_fields.program_name);
                        var tree = people.facet_counts.facet_fields.ent_typeTree;
                        self.facetsTypes(tree);
                        //Use JQUERY UI for interaction with the panels
                        if (!$("#treeCountryLibContainer").data('ui-draggable')) {
                            $(function () {
                                if (screen.width > 500) {
                                    $("#treeCountryLibContainer").draggable();
                                    $("#treeListLibContainer").draggable();
                                    $("#treeTypeLibContainer").draggable().resizable();
                                } else {
                                    $(document).mouseup(function (e)
                                    {
                                        var container = $(".treeContainer");

                                        if (!container.is(e.target) // if the target of the click isn't the container...
                                                && container.has(e.target).length === 0) // ... nor a descendant of the container
                                        {
                                            $("#treeCountryLibContainer").hide("slide", {direction: 'left'}, 1000);
                                            $("#treeListLibContainer").hide("slide", {direction: 'left'}, 1000);
                                            $("#treeTypeLibContainer").hide("slide", {direction: 'left'}, 1000);
                                        }
                                    });
                                }
                            });
                        }
                        //For when collapsing the parent node of each tree
                        $('#treeCountryLib').on('close_node.jstree', function (e, data) {
                            if (data.node.id === "country") {
                                self.treeHeight($("#treeCountryLibContainer").css("height"));
                                $("#treeCountryLibContainer").css({"height": 150});
                            }
                            e.stopImmediatePropagation();
                        });
                        $('#treeCountryLib').on('open_node.jstree', function (e, data) {
                            if (data.node.id === "country") {
                                $("#treeCountryLibContainer").css({"height": self.treeHeight()});
                            }
                            e.stopImmediatePropagation();
                        });
                        $('#treeCountryLib').on('refresh.jstree', function (e, data) {
                            //For when coming back from details page
                            if (getTreeIds(self.filterTreeCountry()).length !== 0) {
                                data.instance.check_node(getTreeIds(self.filterTreeCountry()));
                            }
                            if (treeTranslation) {
                                treeTranslation = false;
                                translateComboboxCountries();
                            }
                            e.stopImmediatePropagation();
                        });
                        $('#treeListLib').on('close_node.jstree', function (e, data) {
                            if (data.node.id === "list") {
                                self.treeHeight($("#treeListLibContainer").css("height"));
                                $("#treeListLibContainer").css({"height": 150});
                            }
                            e.stopImmediatePropagation();
                        });
                        $('#treeListLib').on('open_node.jstree', function (e, data) {
                            if (data.node.id === "list") {
                                $("#treeListLibContainer").css({"height": self.treeHeight()});
                            }
                            e.stopImmediatePropagation();
                        });
                        $('#treeListLib').on('refresh.jstree', function (e, data) {
                            //For when coming back from details page
                            if (self.filterTreeList().length !== 0) {
                                data.instance.check_node(self.filterTreeList());
                            }
                            e.stopImmediatePropagation();
                        });
                        $('#treeTypeLib').on('close_node.jstree', function (e, data) {
                            if (data.node.id === "type") {
                                self.treeHeight($("#treeTypeLibContainer").css("height"));
                                $("#treeTypeLibContainer").css({"height": 150});
                            }
                            e.stopImmediatePropagation();
                        });
                        $('#treeTypeLib').on('open_node.jstree', function (e, data) {
                            if (data.node.id === "ENTITY_GENERAL") {
                                $("#treeTypeLibContainer").css({"height": self.treeHeight()});
                            }
                            e.stopImmediatePropagation();
                        });
                        $('#treeTypeLib').on('refresh.jstree', function (e, data) {
                            if (self.filterTreeType().length !== 0) {
                                var typeIds = new Array();
                                for (var i = 0; i < self.filterTreeType().length; i++) {
                                    typeIds.push($("#treeTypeLib").find('.jstree-leaf:contains(' + self.filterTreeType()[i] + ')')[0].id);
                                }
                                data.instance.check_node(typeIds);
                            }
                            e.stopImmediatePropagation();
                        });
                        //Combobox
                        $("#combobox").on("ojoptionchange", function (event, data) {
                            if (data.value.length > data.previousValue.length) {
                                //for the initialization of the "clear all" icon
                                $("#close-icon-clear-filter-div").css("display", "inline");
                            }
                            //for the delete of an element from oj combobox
                            if (data.previousValue.length > data.value.length && clearCombobox === false) {
                                //To see which value is removed from the combobox
                                var selected = new Array();
                                $.grep(data.previousValue, function (el) {
                                    if ($.inArray(el, data.value) === -1)
                                        selected.push(el);
                                });
                                //Delete Country nodes from the combobox
                                if ($('#treeCountryLib:contains(' + selected[0] + ')').length !== 0 || selMetaCountryTree.length !== 0) {
//                                    var selId = $("#treeCountryLib").find('.jstree-leaf:contains(' + selected[0] + ')')[0].id;
                                    var selId = getSelIdByNameTree(selMetaCountryTree, selected[0]);
                                    $("#treeCountryLib").jstree("uncheck_node", selId);
                                    self.filterTreeCountry.remove(selected[0]);
                                }
                                //Delete List nodes from the combobox
                                if ($('#treeListLib:contains(' + selected[0] + ')').length !== 0) {
                                    var selId = $("#treeListLib").find('.jstree-leaf:contains(' + selected[0] + ')')[0].id;
                                    $("#treeListLib").jstree("uncheck_node", selId);
                                    self.filterTreeList.remove(selected[0]);
                                }
                                //Delete Type nodes from the combobox
                                if ($('#treeTypeLib:contains(' + selected[0] + ')').length !== 0) {
                                    var selId = "";
                                    for (var i = 0; i < selMetaTypeTree.length; i++) {
                                        if (selected[0] === selMetaTypeTree[i].name) {
                                            selId = selMetaTypeTree[i].id;
                                            break;
                                        }
                                    }
                                    $("#treeTypeLib").jstree("uncheck_node", selId);
                                    self.filterTreeType.remove(selected[0]);
                                }
                            }
                            if (clearCombobox) {
                                clearCombobox = false;
                            }
                            self.processFilters();
                            event.stopImmediatePropagation();
                        });
                        $("#close-icon-clear-filter-div").click(function (e) {
                            clearCombobox = true;
                            self.filterTreeCountry.removeAll();
                            self.filterTreeList.removeAll();
                            self.filterTreeType.removeAll();
                            $("#combobox").ojCombobox("option", "value", "");
                            $("#treeCountryLib").jstree().deselect_all(true);
                            $("#treeListLib").jstree().deselect_all(true);
                            $("#treeTypeLib").jstree().deselect_all(true);
                            self.processFilters();
                            e.stopImmediatePropagation();
                        });
                        //
                        //For when selecting a tree node 
                        //
                        //Country Tree
                        $('#treeCountryLib').on('changed.jstree', function (e, data) {
                            if (data.action === "select_node") {
                                userSelectCountryNode = true;
                            }
                            if (data.action === "deselect_node") {
                                userDeselectCountryNode = true;
                                if (userSelectCountryNode)
                                    userSelectCountryNode = false;
                            }
                            if (data.action === "deselect_all") {
                                data.instance.check_node(self.filterTreeCountry());
                            }
                            e.stopImmediatePropagation();
                        });
                        //Node Activation Event when the user clicks on a Country node
                        $('#treeCountryLib').on('activate_node.jstree', function (e, data) {
                            if (userSelectCountryNode) {
                                userSelectCountryNode = false;
                                var filterId = data.node.id;
                                var filterName = data.node.data;
                                //Find duplicate and remove
                                var duplicate = self.filterTreeCountry.remove(filterId);
                                if (filterId === "worldwide") {
                                    var cloneChildren = data.node.children_d.slice(0);
//                                    self.filterTreeCountry(cloneChildren);
                                    $("#treeCountryLib").jstree().select_node(cloneChildren);
                                    self.filterTreeCountry.push("Worldwide");
                                    selMetaCountryTree.push({id: "null", name: "worldwide"});
                                } else if (filterId === "country") {
                                    var cloneChildren = data.node.children_d.slice(0);
                                    $("#treeCountryLib").jstree().select_node(cloneChildren);
                                    var selectedIds = $("#treeCountryLib").jstree().get_selected();
                                    for (var i = 0; i < selectedIds.length; i++) {
//                                        selMetaCountryTree.push({id: selectedIds[i], name: $("#treeCountryLib").jstree().get_node(selectedIds[i]).data});
                                        if (selectedIds[i] !== "country") {
                                            var dataNode = $("#treeCountryLib").jstree().get_node(selectedIds[i]).data;
                                            self.filterTreeCountry().push(dataNode);
                                            selMetaCountryTree.push({id: selectedIds[i], name: dataNode});
                                        }
                                    }
                                } else {
                                    self.filterTreeCountry().push(filterName);
                                    selMetaCountryTree.push({id: filterId, name: filterName});
                                }
                                if (noInputFilterTree) {
                                    self.keepFilter = false;
                                } else {
                                    self.keepFilter = true;
                                }
                                self.filterTreeObs("load");
                            } else if (userDeselectCountryNode) {
                                userDeselectCountryNode = false;
                                var filterId = data.node.id;
                                var filterName = data.node.data;
                                if (filterId === "worldwide") {
                                    var cloneChildren = data.node.children_d.slice(0);
                                    $("#treeCountryLib").jstree().deselect_node(cloneChildren);
                                    self.filterTreeCountry.remove("Worldwide");
                                    removeMetaCountry(["null"]);
                                } else if (filterId === "country") {
                                    var cloneChildren = data.node.children_d.slice(0);
                                    var selectedIds = $("#treeCountryLib").jstree().get_selected();
                                    $("#treeCountryLib").jstree().deselect_node(cloneChildren);
                                    for (var i = 0; i < selectedIds.length; i++) {
                                        if (selectedIds[i] !== "country") {
                                            self.filterTreeCountry.remove($("#treeCountryLib").jstree().get_node(selectedIds[i]).data);
                                        }
                                    }
                                    removeMetaCountry(selectedIds);
                                } else {
                                    var filterNameMeta = "";
                                    for (var i = 0; i < selMetaCountryTree.length; i++) {
                                        if (filterId === selMetaCountryTree[i].id) {
                                            filterNameMeta = selMetaCountryTree[i].name;
                                            break;
                                        }
                                    }
                                    self.filterTreeCountry.remove(filterNameMeta);
                                }
                                if (noInputFilterTree)
                                    self.keepFilter = false;
                                else
                                    self.keepFilter = true;
                                self.filterTreeObs("load");
                            }
                            returningStopComboboxQuery = false;

                            $("#combobox").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                            $("#combobox2").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                            e.stopImmediatePropagation();
                        });
                        //List Tree
                        $('#treeListLib').on('changed.jstree', function (e, data) {
                            if (data.action === "select_node") {
                                userSelectListNode = true;
                            }
                            if (data.action === "deselect_node") {
                                userDeselectListNode = true;
                                if (userSelectListNode)
                                    userSelectListNode = false;
                            }
                            if (data.action === "deselect_all") {
                                data.instance.check_node(self.filterTreeList());
                            }
                            e.stopImmediatePropagation();
                        });
                        //Node Activation Event when the user clicks on a List node
                        $('#treeListLib').on('activate_node.jstree', function (e, data) {
                            if (userSelectListNode) {
                                userSelectListNode = false;
                                var filterValue = data.node.id;
                                //Find duplicate and remove
                                var duplicate = self.filterTreeList.remove(filterValue);
                                if (filterValue !== "list") {
                                    self.filterTreeList().push(filterValue);
                                } else if (filterValue === "list") {
                                    var cloneChildren = data.node.children_d.slice(0);
                                    self.filterTreeList(cloneChildren);
                                    $("#treeListLib").jstree().select_all(true);
                                }
                                if (noInputFilterTree) {
                                    self.keepFilter = false;
                                } else {
                                    self.keepFilter = true;
                                }
                                self.filterTreeObs("load");
                            } else if (userDeselectListNode) {
                                userDeselectListNode = false;
                                var filterValue = data.node.id;
                                if (filterValue !== "list")
                                    self.filterTreeList.remove(filterValue);
                                else if (filterValue === "list") {
                                    self.filterTreeList.removeAll();
                                    $("#treeListLib").jstree().deselect_all(true);
                                }
                                if (noInputFilterTree)
                                    self.keepFilter = false;
                                else
                                    self.keepFilter = true;
                                self.filterTreeObs("load");
                            }
                            returningStopComboboxQuery = false;
                            $("#combobox").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                            $("#combobox2").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                            e.stopImmediatePropagation();
                        });
                        //Type Tree
                        $('#treeTypeLib').on('changed.jstree', function (e, data) {
                            if (data.action === "select_node") {
                                userSelectTypeNode = true;
                            }
                            if (data.action === "deselect_node") {
                                userDeselectTypeNode = true;
                                if (userSelectTypeNode)
                                    userSelectTypeNode = false;
                            }
                            if (data.action === "deselect_all") {
                                data.instance.check_node(self.filterTreeType());
                            }
                            e.stopImmediatePropagation();
                        });
                        //Node Activation Event when the user clicks on a Type node
                        $('#treeTypeLib').on('activate_node.jstree', function (e, data) {
                            if (userSelectTypeNode) {
                                userSelectTypeNode = false;
                                var filterData = data.node.data;
                                var filterId = data.node.id;
                                //Find duplicate and remove
                                self.filterTreeType.remove(filterData);
                                if (filterData !== "Type") {
                                    self.filterTreeType().push(filterData);
                                    selMetaTypeTree.push({id: filterId, name: filterData});
                                } else if (filterData === "Type") {
                                    var cloneChildren = data.node.children_d.slice(0);
//                                    self.filterTreeType(cloneChildren);
                                    $("#treeTypeLib").jstree().select_all(true);
                                    var selectedIds = $("#treeTypeLib").jstree().get_selected();
                                    for (var i = 0; i < selectedIds.length; i++) {
                                        if (selectedIds[i] !== "type") {
                                            self.filterTreeType().push($("#treeTypeLib").jstree().get_node(selectedIds[i]).data);
                                            selMetaTypeTree.push({id: selectedIds[i], name: $("#treeTypeLib").jstree().get_node(selectedIds[i]).data});
                                        }
                                    }
                                }
                                if (noInputFilterTree) {
                                    self.keepFilter = false;
                                } else {
                                    self.keepFilter = true;
                                }
                                self.filterTreeObs("load");
                            } else if (userDeselectTypeNode) {
                                userDeselectTypeNode = false;
                                var filterData = data.node.data;
                                if (filterData !== "Type") {
                                    self.filterTreeType.remove(filterData);
                                    removeMetaType(filterData);
                                } else if (filterData === "Type") {
                                    self.filterTreeType.removeAll();
                                    selMetaTypeTree = [];
                                    $("#treeTypeLib").jstree().deselect_all(true);
                                }
                                if (noInputFilterTree)
                                    self.keepFilter = false;
                                else
                                    self.keepFilter = true;
                                self.filterTreeObs("load");
                            }
                            returningStopComboboxQuery = false;
                            $("#combobox").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                            $("#combobox2").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                            e.stopImmediatePropagation();

                        });

                    }).fail(function (error) {
                        console.log('Error in getting People data: ' + error.responseText);
                    });
                };

                //Set workers to build the tree when there is a new response from SOLR
                self.facetsTypes.subscribe(function (newValue) {
                    if (self.keepFilter === false || !newSearch) {
                        self.getTranslationCountries("");
//                        self.worker.postMessage(self.facetsCountries());
                        self.worker.onmessage = function (m) {
                            m.data[0].title = countryFilterPanelTitle;
                            self.workerCountryResult(m.data);
                            $('#treeCountryLib').jstree(true).settings.core.data = self.workerCountryResult();
                            $('#treeCountryLib').jstree(true).refresh();

                        };
                        self.workerList.postMessage(self.facetsLists());
                        self.workerList.onmessage = function (m) {
                            m.data[0].title = listFilterPanelTitle;
                            self.workerListResult(m.data);
                            $('#treeListLib').jstree(true).settings.core.data = self.workerListResult();
                            $('#treeListLib').jstree(true).refresh();
                        };
                        self.workerType.postMessage(self.facetsTypes());
                        self.workerType.onmessage = function (m) {
                            m.data[0].title = typeFilterPanelTitle;
                            self.workerTypeResult(m.data);
                            $('#treeTypeLib').jstree(true).settings.core.data = self.workerTypeResult();
                            $('#treeTypeLib').jstree(true).refresh();
                        };
                    }
                });

                //get the code from the full name
                function getCode(name) {
                    var code;
//                    for (var i = 0; i < self.countriesTranslated.length; i++) {
//                        if (name === self.countriesTranslated[i].country) {
//                            code = self.countriesTranslated[i].code;
//                            break;
//                        }
//                    }
                    for (var i = 0; i < selMetaCountryTree.length; i++) {
                        if (name === selMetaCountryTree[i].name) {
                            code = selMetaCountryTree[i].id;
                            break;
                        }
                    }
                    return code;
                }

                //Used for specifying when to keep the filter and when to update it
                var noInputFilterTree = true;

                //Process filters
                self.processFilters = function () {
                    var fq = "";
                    if (newSearch)
                        self.start(0);
                    if (self.filterTreeCountry().length > 0) {
//                        fq = "add_country:" + "\"" + self.filterTreeCountry()[0] + "\"";
                        fq = "add_country:" + "\"" + getCode(self.filterTreeCountry()[0]) + "\"";
                        for (var i = 1; i < self.filterTreeCountry().length; ++i) {
                            if (self.filterTreeCountry()[i] !== undefined)
//                                fq = fq + " OR " + "add_country:" + "\"" + self.filterTreeCountry()[i] + "\"";
                                fq = fq + " OR " + "add_country:" + "\"" + getCode(self.filterTreeCountry()[i]) + "\"";
                        }
                        fq = "&fq=" + urlEncodeComponent(fq);
                    } else if (self.filterTreeCountry().length === 0)
                        fq = "";
                    self.fqCountry(fq);
                    var fqList = "";
                    if (self.filterTreeList().length > 0) {
                        var list = encodeURIComponent(self.filterTreeList()[0]);
                        fqList = "program_name:" + "\"" + list + "\"";
                        for (var i = 1; i < self.filterTreeList().length; ++i) {
                            if (self.filterTreeList()[i] !== undefined) {
                                list = encodeURIComponent(self.filterTreeList()[i]);
                                fqList = fqList + " OR " + "program_name:" + "\"" + list + "\"";
                            }
                        }
                        fqList = "&fq=" + urlEncodeComponent(fqList);
                    } else if (self.filterTreeList().length === 0)
                        fqList = "";
                    self.fqList(fqList);
                    var fqType = "";
                    if (self.filterTreeType().length > 0) {
                        fqType = "ent_typeName:" + "\"" + self.filterTreeType()[0] + "\"";
                        for (var i = 1; i < self.filterTreeType().length; ++i) {
                            if (self.filterTreeType()[i] !== undefined)
                                fqType = fqType + " OR " + "ent_typeName:" + "\"" + self.filterTreeType()[i] + "\"";
                        }
                        fqType = "&fq=" + urlEncodeComponent(fqType);
                    } else if (self.filterTreeType().length === 0)
                        fqType = "";
                    self.fqType(fqType);
                    if (noInputFilterTree) {
                        oneRequest = true;
                        noInputSolrRequest();
                    } else
                        self.filterTreeObs("ready");
                };

                //Subscription for the Search Input
                self.nameSearch.subscribe(function (newValue) {
                    if (newSearch) {
                        $("#searchedItemsContainer").scrollTop(0);
                        self.keepFilter = false;
                        self.start(0);
                        self.rows(48);
                        self.numberPage("");
                    } else {
                        newSearch = true;
                    }
                    //var regexMultilingual = /[\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]+/g;
                    //if (self.nameSearch().search(regexMultilingual) !== -1) {
                    var regexEmptyString = "^\\s*$";
                    if (newValue.search(regexEmptyString) !== -1) {
                        self.allPeople([]);
                        firstPage = true;
                        self.noResults("");
                        self.hitsValue(0);
                        self.numberMatches("");
                        //Query SOLR to populate the trees
                        self.fqTotalPercentage("");
//                        self.queryField('&q=');
                        self.nameQ("*");
                        queryField = "";
                        self.getSolrDataTree();
                        //When the search input turns empty again do SOLR query to show results based on the remained filters
                        if ($("#combobox").ojCombobox("option", "value").length > 0) {
                            oneRequest = true;
                            noInputSolrRequest();
                        }
                    }

                });

                //Advanced Menu Dialog Handling
                //
                self.handleOpenMenu = function (event, ui) {
                    $("#modalDialog1").ojDialog("open");
                    self.currentPhrasePercentageText = self.phrasePercentage();
                    self.currentwordPercentage = self.wordPercentage();
                    self.currentScoreAlgorithm = self.scoreAlgorithm();
                    self.currentWordsDistanceAlgorithm = self.wordsDistanceAlgorithm();
                    self.currentCalendarSelect = self.calendarSelect();
                };
                self.handleOKMenu = function (event, ui) {
                    $("#modalDialog1").ojDialog("close");
                    self.filterTreeObs("ready");
                    self.keepFilter = false;
//                    utils.createCookie("calendarSelect", self.calendarSelect(), 30);
                    utils.createCookie("wordPercentage", self.wordPercentage(), 30);
                    utils.createCookie("phrasePercentage", self.phrasePercentage(), 30);
                    utils.createCookie("scoreAlgorithm", self.scoreAlgorithm(), 30);
                    utils.createCookie("wordsDistanceAlgorithm", self.wordsDistanceAlgorithm(), 30);
                    //For making a request when there is no input but the calendar value in the adv menu changes
                    if ($("#searchText").val().search("^\\s*$") === 0 && self.calendarSelect() !== calendarBefore) {
                        oneRequest = true;
                        noInputSolrRequest();
                        oneRequest = false;
                    }
                    var calendarBefore = self.calendarSelect();
                };
                self.handleCloseMenu = function (event, ui) {
                    self.filterTreeObs("ready");
                    self.keepFilter = false;
                    //If cancel then revert the value to original
                    if (event.originalEvent) {
                        self.phrasePercentage(self.currentPhrasePercentageText);
                        self.wordPercentage(self.currentwordPercentage);
                        self.scoreAlgorithm(self.currentScoreAlgorithm);
                        self.wordsDistanceAlgorithm(self.currentWordsDistanceAlgorithm);
                        self.calendarSelect(self.currentCalendarSelect);
                    }
                    //DO not create cookies if user do not click OK
//                    utils.createCookie("calendarSelect", self.calendarSelect(), 30);
//                    utils.createCookie("wordPercentage", self.wordPercentage(), 30);
//                    utils.createCookie("phrasePercentage", self.phrasePercentage(), 30);
//                    utils.createCookie("scoreAlgorithm", self.scoreAlgorithm(), 30);
//                    utils.createCookie("wordsDistanceAlgorithm", self.wordsDistanceAlgorithm(), 30);
                };
                //
                //END Advanced Menu Dialog Handling

                //For the clear button
                self.handleClearButton = function (event, ui) {
                    self.nameSearch("");
                    $("#combobox").ojCombobox("option", "value", "");
                };


                //For the Tree Open Button, to display the filter panels
                self.openCountryTree = function (event, ui, isClosed) {
                    if (isClosed) {

                    } else {
                        if ($("#treeCountryLibContainer").css("display") !== "none") {
                            $("#treeCountryLibContainer").hide("slide", {direction: 'left'}, 1000);
                        } else {
                            $("#treeCountryLibContainer").show("slide", {direction: 'left'}, 1000);
//                        if ($("#globalBody").width() < 1200) {
////                            setInterval($('#container_for_search_and_filter').removeClass("sticky"),1100)
//                            $('#container_for_search_and_filter').removeClass("sticky");
//                        }
                        }
                        //For when the users click on X on the filter tree panels
                        $('#country-close').on('click', function (e) {
                            $("#treeCountryLibContainer").hide("slide", {direction: 'left'}, 1000);
                            e.stopImmediatePropagation();
                        });
                    }
                };
                self.openListTree = function (event, ui, isClosed) {
                    if (isClosed) {

                    } else {
                        if ($("#treeListLibContainer").css("display") !== "none") {
                            $("#treeListLibContainer").hide("slide", {direction: 'left'}, 1000);
                        } else {
                            $("#treeListLibContainer").show("slide", {direction: 'left'}, 1000);
                        }
                        //For when the users click on X on the filter tree panels
                        $('#list-close').on('click', function (e) {
                            $("#treeListLibContainer").hide("slide", {direction: 'left'}, 1000);
                            e.stopImmediatePropagation();
                        });
                    }
                };
                self.openTypeTree = function (event, ui, isClosed) {
                    if (isClosed) {
                        $("#treeTypeLibContainer").hide("slide", {direction: 'left'}, 1000);
                    } else {
                        if ($("#treeTypeLibContainer").css("display") !== "none") {
                            $("#treeTypeLibContainer").hide("slide", {direction: 'left'}, 1000);
                        } else {
                            $("#treeTypeLibContainer").show("slide", {direction: 'left'}, 1000);
                        }
                        //For when the users click on X on the filter tree panels
                        $('#type-close').on('click', function (e) {
                            $("#treeTypeLibContainer").hide("slide", {direction: 'left'}, 1000);
                            e.stopImmediatePropagation();
                        });
                    }
                };


                //------------------------------------------------

                //SOLR request when there is no search input, only when selecting tree filter
                self.emptySearchSolr = ko.observableArray([]);
                var numberEntitiesEmptyInput = 0;
                var oneRequest = true;
                function noInputSolrRequest() {
                    var allFilters = self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType()));
                    if (oneRequest === true && allFilters.length !== 0) {
                        self.keepFilter = true;
                        //For Live Scrolling it is needed the stopScroll to perform only one request
                        if (stopScroll) {
                            stopScroll = false;
                        }
                        //Facets Filter
                        var fqCountries = self.fqCountry();
                        var fqLists = self.fqList();
                        var fqType = self.fqType();
                        var name = "*";
                        if (fqCountries.search("undefined") !== -1)
                            fqCountries = "";
//                        self.queryField("&q=");
                        self.nameQ(name);
                        var solrUrl;
                        var fqOriginalName = "nam_original:true";
                        solrUrl = self.url().toString() + '&start=' + self.start() + '&rows=' + self.rows() +
//                                self.groupField().toString() +
                                "&group.cache.percent=" + groupCachePercent + "&group.field=" + groupField + "&group.ngroups" + groupNgroups +
                                "&group.truncate=" + groupTruncate + "&group=" + group +
                                "&fl=" + scoreField +
                                fqCountries + fqLists + fqType +
                                "&fq=" + fqOriginalName +
                                "&fq=" + urlEncodeComponent(self.fqCalendar()) +
                                "&q=" + urlEncodeComponent(queryField) +
                                urlEncodeComponent(name);
                        AJAXurl = self.url().toString() + '&start=' + self.start() + '&rows=10000' +
//                                self.groupField().toString() +
                                "&group.cache.percent=" + groupCachePercent + "&group.field=" + groupField + "&group.ngroups" + groupNgroups +
                                "&group.truncate=" + groupTruncate + "&group=" + group +
                                "&fl=" + scoreField +
                                fqCountries + fqLists + fqType +
                                "&fq=" + fqOriginalName +
                                +urlEncodeComponent(self.fqCalendar()) +
                                "&q=" + urlEncodeComponent(queryField) +
                                urlEncodeComponent(name);
                        if (!newSearch) {
                            self.getSolrDataTree();
                        }
                        $.getJSON(solrUrl).then(function (people) {
                            //self.allPeople(people);
                            numberEntitiesEmptyInput = people.grouped.ent_id.ngroups;
                            self.hitsValue(people.grouped.ent_id.ngroups);
                            if (self.hitsValue() === 0) {
                                self.noResults("No Results");
                                self.numberPage("");
                            } else if (self.hitsValue() !== 0) {
                                self.noResults("");
                            }
                            //Another observable for the cardViewPagingDataSource 
                            self.emptySearchSolr(people.grouped.ent_id.groups);
                        }).fail(function (error) {
                            console.log('Error in getting People data: ' + error.responseJSON.error.msg);
                        });
                    }
                }

                //Used for indicating to not reset the values after a return from the details page
                var newSearch = true;
                var returningStopComboboxQuery = false;

                //Global Back indicator
                var back = false;

                if (utils.routerGoBackDetails === true && utils.clearSearchPage === false) {
                    back = true;
                }
                if (utils.resetState()[0].length === 0 && utils.resetState()[1].length === 0 && utils.resetState()[2].length === 0 && utils.resetState()[3].length === 0) {
                    back = false;
                }
                //To establish the previous state after returning from details page. The second condition is for when clicking on the Search button.
                if (back) {
                    newSearch = false;
                    returningStopComboboxQuery = true;
                    self.fqCountry(utils.resetSolr()[0]);
                    self.fqList(utils.resetSolr()[1]);
                    self.fqType(utils.resetSolr()[2]);
//                    self.calendarSelect(utils.resetSolr()[3]);
//                    self.wordPercentage(utils.resetSolr()[4]);
//                    self.phrasePercentage(utils.resetSolr()[5]);
//                    self.scoreAlgorithm(utils.resetSolr()[6]);
//                    self.wordsDistanceAlgorithm(utils.resetSolr()[7]);
                    self.filterTreeCountry(utils.resetState()[1]);
                    self.filterTreeList(utils.resetState()[2]);
                    self.filterTreeType(utils.resetState()[3]);

                    selMetaCountryTree = utils.resetTreeMeta()[0];
                    selMetaTypeTree = utils.resetTreeMeta()[1];

//                    $("#treeCountryLib").jstree().check_node(self.filterTreeCountry());
//                    $("#treeListLib").jstree().check_node(self.filterTreeList());
//                    $("#treeTypeLib").jstree().check_node(self.filterTreeType());

                    self.start(utils.resetState()[4]);
                    if (utils.resetState()[4] !== 1 && utils.resetState()[4] !== "")
                        firstPage = false;
                    if (utils.resetState()[0].length === 0)
                        self.processFilters();
                    self.rows(utils.resetState()[6]);
                    self.nameSearch(utils.resetState()[0]);
                } else {

                    //Tree first initialization
                    self.fqTotalPercentage("");
//                    self.queryField('&q=');
                    self.nameQ("*");
                    queryField = "";
                    self.getSolrDataTree();
                    newSearch = true;
                }

                //Search Input Listener
                //
                var xhr = null;
                var requestId = 0;
                var ajaxIds = new Array();
                //
                self.filteredAllPeople = ko.pureComputed(function () {
                    var peopleFilter = new Array();
                    var regexEmptyString = "^\\s*$";
                    if (self.nameSearch().search(regexEmptyString) !== -1) {
                        //Init
                        self.nameQ("");
                        nameBeforeUpdate = "";
                        self.fqTotalPercentage("");
                        self.keepFilter = false;
                        noInputFilterTree = true;
                        //For when refreshing the details page and returning to the search page
                        if (utils.getLanguage() !== undefined)
                            self.languageSel(utils.getLanguage().toString());
                    } else {
                        if (self.nameSearch() !== nameBeforeUpdate || self.filterTreeObs() === "ready" || stopScroll === true) {
                            //For Live Scrolling it is needed the stopScroll to perform only one request
                            if (stopScroll) {
                                stopScroll = false;
                            }
                            if (self.filterTreeObs() === "done")
                                self.keepFilter = false;
//                            if (self.filterTreeObs() === "ready")
//                                self.keepFilter = true;
                            if (self.comboObservable() === "combobox")
                                if (self.comboboxSelectValue().length === 0)
                                    self.keepFilter = false;
                            //Facets Filter
                            var fqCountries = self.fqCountry();
                            var fqLists = self.fqList();
                            var fqType = self.fqType();
                            var name = "";
                            var solrUrl = "";
                            name = self.nameSearch();
                            if (fqCountries.search("undefined") !== -1)
                                fqCountries = "";
                            //Integrate the percentage values into the self.queryField()
                            var wordPercentage = "pw=" + (self.wordPercentage() / 100).toString();
                            //Initial characters
                            var ic = "ic=1";
                            //Initial characters percentage
                            var icp = "icp=" + (self.phrasePercentage() - 1) / 100;
                            //The percentage of the phrase
                            var phrasePercentage = (self.phrasePercentage() / 100).toString();
                            var strategy = "strategy=percentage";
//                            var strategy = "";
                            queryField = "{!percentage f=nam_comp_name" + " " + strategy + " " + "t=" + self.scoreAlgorithm() + " " +
                                    wordPercentage + " " + ic + " " + icp + " " + "alg=" + self.wordsDistanceAlgorithm() + "}";
//                            self.fqTotalPercentage("&fq={!percentagefilter p=" + phrasePercentage + "}");
                            self.fqTotalPercentage("{!percentagefilter p=" + phrasePercentage + "}");
                            if (name === "" || name === " ")
                                self.fqTotalPercentage("");
                            self.nameQ(name);
                            requestId = requestId + 1;
                            var requestIdSolr = "&requestId=" + requestId;
                            var encodedName = urlEncodeComponent(name);
                            AJAXurl = self.url().toString() + '&start=' + self.start() + '&rows=10000' +
                                    //self.highlightField().toString() +
                                    "&hl.fl=" + hlFl + "&hl.simple.pre=" + hlSimplePre + "&hl.simple.post=" + hlSimplePost + "&hl=" + hl +
                                    //self.groupField().toString() +
                                    +"&group.cache.percent=" + groupCachePercent + "&group.field=" + groupField + "&group.ngroups=" + groupNgroups +
                                    "&group.truncate=" + groupTruncate + "&group=" + group +
                                    "&fl=" + scoreField +
                                    fqCountries + fqLists + fqType +
                                    "&fq=" + urlEncodeComponent(self.fqTotalPercentage()) +
                                    "&fq=" + urlEncodeComponent(self.fqCalendar()) +
                                    "&q=" + urlEncodeComponent(queryField) +
                                    encodedName + requestIdSolr;
                            solrUrl = self.url().toString() + '&start=' + self.start() + '&rows=' + self.rows() +
                                    //self.highlightField().toString() +
                                    "&hl.fl=" + hlFl + "&hl.simple.pre=" + hlSimplePre + "&hl.simple.post=" + hlSimplePost + "&hl=" + hl +
                                    //self.groupField().toString() +
                                    +"&group.cache.percent=" + groupCachePercent + "&group.field=" + groupField + "&group.ngroups=" + groupNgroups +
                                    "&group.truncate=" + groupTruncate + "&group=" + group +
                                    "&fl=" + scoreField +
                                    fqCountries + fqLists + fqType +
                                    "&fq=" + urlEncodeComponent(self.fqTotalPercentage()) +
                                    "&fq=" + urlEncodeComponent(self.fqCalendar()) +
                                    "&q=" + urlEncodeComponent(queryField) +
                                    encodedName + requestIdSolr;

                            self.getSolrDataTree();

                            xhr = $.ajax({
                                method: "GET",
                                url: solrUrl,
                                dataType: "json",
                                beforeSend: function () {
                                    //if a previous request exists, abort it. always abort the previous request.
                                    if (xhr !== null) {
                                        xhr.abort();
                                    }
                                },
                                success: function (people) {
                                    var actualRequestId = parseInt(people.responseHeader.params.requestId);
                                    if (actualRequestId === requestId) {
                                        self.allPeople(people);
                                        if (people.highlighting !== undefined) {
                                            self.allHighlighting(people.highlighting);
                                        }
                                        self.hitsValue(people.grouped.ent_id.ngroups);
                                        if (self.hitsValue() === 0) {
                                            self.noResults("No Results");
                                            self.numberPage("");
                                        } else if (self.hitsValue() !== 0) {
                                            self.noResults("");
                                        }
                                    }
                                },
                                error: function (error) {
                                    if (error.responseJSON !== undefined)
                                        console.log("Error in getting People data: " + error.responseJSON.error.msg);
                                    else
                                        console.log("Error in getting People data, " + "status:" + error.state());
                                }
                            });
                            self.filterTreeObs("done");
                            self.comboObservable("done");
                            nameBeforeUpdate = self.nameSearch();
                            noInputFilterTree = false;
                        }
                        if (self.allPeople().grouped !== undefined) {
//                            var entities = self.allPeople().grouped.ent_id.groups;
//                            if (self.calendarSelect()[0] !== "all") { 
//                                peopleFilter = filteredByCalendar(entities);
//                            } else {
//                                peopleFilter = entities;
//                            }
                            peopleFilter = self.allPeople().grouped.ent_id.groups;
                        }
                    }
                    self.ready(true);

                    return peopleFilter;
                }).extend({deferred: true});

                // Live scrolling variables
                var lastScrollTop, lastScrollTopSearchBar = 0;
                var scrollTimer, scrollTimerSearchBar, lastScrollFireTime, lastScrollFireTimeSearchBar = 0;
                var timerSearchBar;

                function addStickySearchBar() {
                    $('#searchBarScroll').addClass("sticky");
                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("top", $('#searchBarScroll').height() + 5);
                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("height", "96%");
                }
                function removeStickySearchBar() {
                    $('#searchBarScroll').removeClass("sticky");
                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("top", 0);
                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("height", "100%");
                }

                function liveScrolling() {
                    var insideScrollDiv = $("#searchedItemsContainer");
                    var outsideScrollDiv = $("#scrollContainer");
                    var selectedScrollDiv;

                    var globalWidth = $("#globalBody").width();
                    if (globalWidth < 1200) {
                        selectedScrollDiv = outsideScrollDiv;
                    } else {
                        selectedScrollDiv = insideScrollDiv;
                    }

                    $(document.body).on('touchstart', '#scrollContainer', function (e) {
                        //alert("touchstart") 
                        var swipe = e.originalEvent.touches,
                                start = swipe[0].pageY;

                        $(this).on('touchmove', function (e) {

                            var contact = e.originalEvent.touches,
                                    end = contact[0].pageY,
                                    distance = end - start;

                            if (distance < -30) {
                                //Swipe up, Scroll Down
                                window.scrollTo(0, 1);
                                removeStickySearchBar();
                            }
                            if (distance > 30) {
                                //Swipe down, Scroll Up
                                if (outsideScrollDiv.scrollTop() > 400) {
                                    addStickySearchBar();
                                }
                                if (outsideScrollDiv.scrollTop() < 300) {
                                    removeStickySearchBar();
                                }
                            }
                        }).one('touchend', function () {
                            $(this).off('touchmove touchend');
                        });
//                        event.stopImmediatePropagation();
                    });

                    //For the Live Scroll
                    selectedScrollDiv.scroll(function (event) {
                        //if the search bar is visible, remove it when going up to the fixed searched bar
                        if($('#scrollContainer').scrollTop() < 160){
                            removeStickySearchBar();
                        }
                        //For the search bar display for smartphones
                        function processScrollingSearchBar() {
                            //Scroll Down
                            if (outsideScrollDiv.scrollTop() > lastScrollTopSearchBar) {
                                if (outsideScrollDiv.scrollTop() > 400) {
                                    window.scrollTo(0, 1);
                                    $('#searchBarScroll').removeClass("sticky");
                                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("top", 0);
                                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("height", "100%");
                                }
                            }
                            //Scroll Up
                            else {
                                if (outsideScrollDiv.scrollTop() > 400) {
                                    $('#searchBarScroll').addClass("sticky");
                                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("top", $('#searchBarScroll').height() + 5);
                                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("height", "96%");
                                }
                                if (outsideScrollDiv.scrollTop() < 300) {
                                    $('#searchBarScroll').removeClass("sticky");
                                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("top", 0);
                                    $('#treeTypeLibContainer, #treeListLibContainer, #treeCountryLibContainer').css("height", "100%");
                                }
                            }
//                            console.log(outsideScrollDiv.scrollTop() + " > " + lastScrollTopSearchBar)
                            lastScrollTopSearchBar = outsideScrollDiv.scrollTop();
                        }
                        if (timerSearchBar) {
                            window.clearTimeout(timerSearchBar);
                        }
//                        if (globalWidth < 1200) {
////                            timerSearchBar = window.setTimeout(function () {
////                                processScrollingSearchBar();
////                            }, 100);
//                            processScrollingSearchBar();
//                        }


                        //----------------------------//

                        //for the live scrolling
                        function processScroll() {
                            //Scroll Downward
                            if (selectedScrollDiv.scrollTop() > lastScrollTop) {
                                var numberEntities;
                                if (self.allPeople().length !== 0) {
                                    numberEntities = self.allPeople().grouped.ent_id.ngroups;
                                } else {
                                    numberEntities = numberEntitiesEmptyInput;
                                }
//                                if (outsideScrollDiv.scrollTop() > 400) {
//                                    $('#container_for_search_and_filter').removeClass("sticky");
//                                }
                                if ((numberEntities > self.start() + 40) && (numberEntities > self.start() + self.rows())) {
                                    if (firstPage) {
                                        self.numberPage(1);
                                        firstPage = false;
                                    }
                                    if (selectedScrollDiv.scrollTop() + selectedScrollDiv.innerHeight() >= selectedScrollDiv[0].scrollHeight * 0.99) {

                                        
                                        stopScroll = true;
                                        //For the outside scroll div
                                        if (globalWidth < 1200) {
                                            self.rows(self.rows() + 48);
                                        } else if (globalWidth > 1200) {
                                            self.start(self.start() + 24);
                                        }
                                        var ratioScrollingDown;
                                        var ratioScrollingDownFourColumns = 1.93;
                                        var ratioScrollingDownThreeColumns = 1.95;
                                        var ratioScrollingDownTwoColumns = 1.97;
                                        var ratioScrollingDownOneColumns = 1.98;
                                        if (selectedScrollDiv[0].scrollHeight < 3000)
                                            ratioScrollingDown = ratioScrollingDownFourColumns;
                                        else if (selectedScrollDiv[0].scrollHeight > 3000 && selectedScrollDiv[0].scrollHeight < 4500)
                                            ratioScrollingDown = ratioScrollingDownThreeColumns;
                                        else if (selectedScrollDiv[0].scrollHeight > 4500 && selectedScrollDiv[0].scrollHeight < 6500)
                                            ratioScrollingDown = ratioScrollingDownTwoColumns;
                                        else if (selectedScrollDiv[0].scrollHeight > 6500)
                                            ratioScrollingDown = ratioScrollingDownOneColumns;
                                        if (globalWidth > 1200) {
                                            selectedScrollDiv.scrollTop((selectedScrollDiv[0].scrollHeight / ratioScrollingDown) - selectedScrollDiv.innerHeight());
                                        }
                                        if (noInputFilterTree) {
                                            oneRequest = true;
                                            noInputSolrRequest();
                                        } else{
                                            self.filterTreeObs("scrolling downward");
                                        }
                                        
                                    }
                                }
                            }
                            //Scroll Upward
                            else {
//                                if (outsideScrollDiv.scrollTop() > 400) {
//                                    $('#container_for_search_and_filter').addClass("sticky");
//                                }
//                                if (outsideScrollDiv.scrollTop() < 300) {
//                                    $('#container_for_search_and_filter').removeClass("sticky");
//                                }
                                if (globalWidth > 1200) {
                                    if (selectedScrollDiv.scrollTop() <= 0 && self.start() >= 24) {

                                        stopScroll = true;
                                        var ratioScrollingUp;
                                        var ratioScrollingUpFourColumns = 1.30;
                                        var ratioScrollingUpThreeColumns = 1.40;
                                        var ratioScrollingUpTwoColumns = 1.50;
                                        var ratioScrollingUpOneColumns = 1.55;
                                        var ratioHeight = 0.0;
                                        if ($("#globalBody").height() < 900 && $("#globalBody").height() > 830) {
                                            ratioHeight = 0.05;
                                        } else if ($("#globalBody").height() < 830 && $("#globalBody").height() > 800) {
                                            ratioHeight = 0.10;
                                        } else if ($("#globalBody").height() < 800 && $("#globalBody").height() > 730) {
                                            ratioHeight = 0.15;
                                        } else if ($("#globalBody").height() < 730 && $("#globalBody").height() > 650) {
                                            ratioHeight = 0.20;
                                        } else if ($("#globalBody").height() < 650 && $("#globalBody").height() > 550) {
                                            ratioHeight = 0.30;
                                        } else if ($("#globalBody").height() < 550) {
                                            ratioHeight = 0.35;
                                        }
                                        if (selectedScrollDiv[0].scrollHeight < 3000) {
                                            ratioScrollingUp = ratioScrollingUpFourColumns + ratioHeight;
                                        } else if (selectedScrollDiv[0].scrollHeight > 3000 && selectedScrollDiv[0].scrollHeight < 4500) {
                                            ratioScrollingUp = ratioScrollingUpThreeColumns + ratioHeight;
                                        } else if (selectedScrollDiv[0].scrollHeight > 4500 && selectedScrollDiv[0].scrollHeight < 6500) {
                                            ratioScrollingUp = ratioScrollingUpTwoColumns + ratioHeight - 0.05;
                                        } else if (selectedScrollDiv[0].scrollHeight > 6500) {
                                            ratioScrollingUp = ratioScrollingUpOneColumns + ratioHeight;
                                        }

                                        if (self.start() > 24) {
                                            self.start(self.start() - 24);
                                            selectedScrollDiv.scrollTop((selectedScrollDiv[0].scrollHeight / ratioScrollingUp) - selectedScrollDiv.innerHeight());
                                        } else if (self.start() === 24) {
                                            self.start(0);
                                            selectedScrollDiv.scrollTop((selectedScrollDiv[0].scrollHeight / ratioScrollingUp) - selectedScrollDiv.innerHeight());
                                            self.numberPage(1);
                                        }
                                        if (noInputFilterTree) {
                                            oneRequest = true;
                                            noInputSolrRequest();
                                        } else
                                            self.filterTreeObs("scrolling upward");
                                    }
                                }
                            }
                            lastScrollTop = selectedScrollDiv.scrollTop();
                        }
                        var minScrollTime = 800;
                        var now = new Date().getTime();
                        if (!scrollTimer) {
                            if (now - lastScrollFireTime > (3 * minScrollTime)) {
                                processScroll();   // fire immediately on first scroll
                                lastScrollFireTime = now;
                            }
                            scrollTimer = setTimeout(function () {
                                scrollTimer = null;
                                lastScrollFireTime = new Date().getTime();
                                processScroll();
                            }, minScrollTime);
                        }
                        event.stopImmediatePropagation();
                    });
                }

                self.cardViewPagingDataSource = ko.computed(function () {
                    //Displaying results
                    var arrayPaging = new oj.ArrayPagingDataSource(self.filteredAllPeople());
                    if (noInputFilterTree) {
                        arrayPaging = new oj.ArrayPagingDataSource(self.emptySearchSolr());
                        oneRequest = false;
                    }
                    return arrayPaging;
                }).extend({deferred: true});
                /**/
                self.cardViewDataSource = ko.pureComputed(function () {
                    return self.cardViewPagingDataSource().getWindowObservable();
                });
                /**/

                //Mainly used for the Live Scrolling. It is to wait some time before visualizing the scrolled information properly
                self.cardViewDataSource.extend({rateLimit: {timeout: 66, method: "notifyWhenChangesStop"}});

                self.cardViewDataSource.subscribe(function (newValue) {
                    if (back && !newSearch) {
                        //Set Language
                        var language = utils.getLanguage().toString();
                        self.languageSel(language);
                        //Set combo filters
                        $("#combobox").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                        $("#combobox2").ojCombobox("option", "value", self.filterTreeCountry().concat(self.filterTreeList().concat(self.filterTreeType())));
                        if ($("#combobox").ojCombobox("option", "value").length !== 0) {
                            $("#close-icon-clear-filter-div").css("display", "inline");
                        } else {
                            $("#close-icon-clear-filter-div").css("display", "none");
                        }
                        //show less button combobox
                        self.checkFilterHeight();
                        //Set scroll position
                        setTimeout(function () {
                            if ($("#globalBody").width() > 1200) {
                                $("#searchedItemsContainer").scrollTop(utils.resetState()[5]);
                            } else {
                                $("#scrollContainer").scrollTop(utils.resetState()[5]);
                                $("#paging").ojPagingControl("refresh");
                            }
                            //console.log("cardView ScrollTop: " + $("#searchedItemsContainer").scrollTop());
//                            newSearch = true;

                        }, 200);
                    }
                    if (newValue().length > 0) {
                        if (self.start() === 0)
                            firstPage = true;
                        var outOf;
                        var rows = self.start() + self.rows();
                        if (rows > self.hitsValue())
                            outOf = self.hitsValue();
                        else {
                            outOf = rows;
                        }
                        self.currentHitsValue(" [" + self.start() + " ... " + (outOf) + "] ");
                        self.numberMatches(self.preCurrentHitsText() + self.currentHitsValue() + self.afterCurrentHitsText() + " " + self.hitsValue() + " " + self.hitsText());
                    } else {
                        self.numberPage("");
                        self.numberMatches("");
                    }

                    //Scrolling Function
                    liveScrolling();

                    //
                    //For Smartphones, when there are no filters hide the combobox area 
                    //
                    if ($("#globalBody").width() < 650) {
                        if ($("#combobox").ojCombobox("option", "value").length === 0) {
                            $("#form1").css("display", "none");
                        } else if ($("#combobox").ojCombobox("option", "value").length !== 0) {
                            $("#form1").css("display", "block");
                        }
                    }
                    //
                    //
                    //

                    //show less button combobox
                    self.checkFilterHeight();
                });

                self.numberMatches.subscribe(function (newValue) {
                    if (self.hitsValue() !== 0 && self.hitsValue() !== "") {
                        var page;
                        if (self.start() !== 0) {
                            page = parseInt(self.start() / 24) + 1;
                            self.numberPage(page);
                        }
                        if (self.start() === 0 && self.numberPage() !== 1 && self.numberPage() !== "")
                            self.numberPage(1);
                    }
                });


                self.getPhotoDate = function (company) {
                    try {
                        var validFrom = company.doclist.docs[0].ent_validFrom;
                        var validTo = company.doclist.docs[0].ent_validTo;
                        //------------
                        //In the begining the postbox in the header does not send the initial value to the search page 
                        var refDate;
                        if (self.calendarSearch() !== "") {
                            refDate = self.calendarSearch();
                        } else {
                            refDate = ko.dataFor(document.getElementById('dateTime')).calendar();
                        }
                        //-----------
                        var statusNonExistence = false;
                        if (company.doclist.docs[0].ent_statusType === "STATUS_NON_EXISTENCE") {
                            statusNonExistence = true;
                        }
                        var src = utils.getDateImgSrc(refDate, validFrom, validTo, statusNonExistence);
                        return src;
                    } catch (e) {
                        console.log("Something is wrong");
                        return "";
                    }
                };

                self.setTitle = function (company) {

                    try {

                        imgScr = this.getPhotoDate(company);
                        if (imgScr.indexOf('before') !== -1) {
                            return "This entity is not yet effective with current reference date";
                        } else if (imgScr.indexOf('after') !== -1)
                        {
                            return "This entity is no longer effective with current reference date";
                        } else if (imgScr.indexOf('notFound') !== -1) {
                            return "We cannot find legal information concerning this entity";
                        } else
                            return "";
                    } catch (e) {
                        return "Waiting for tooltip text";
                    }
                };

                self.getPhoto = function (company) {
                    try {
                        var src = utils.getImgSrc(company.doclist.docs[0].ent_type);
                        return src;
                    } catch (e) {
                        console.log("Something is wrong");
                        return "";
                    }
                };

                self.getList = function (company) {
                    try {
                        var listName;
                        if (company.doclist.docs[0].program_name === "null")
                            listName = "NO LIST";
                        else
                            listName = company.doclist.docs[0].program_name;
                        if (listName.length > 40) {
                            var shortList = listName.substring(0, 40) + "...";
                            shortList = "<div >" + shortList + "</div>";
                            var shortListHtml = $($.parseHTML(shortList));
                            shortListHtml.append('<div class="tooltipList">' + listName + '</div>');
                            listName = shortListHtml[0].outerHTML;
                        }
                        return listName;
                    } catch (e) {
                        console.log("Something is wrong");
                        return "";
                    }
                };

                function htmlSubstring(s, n) {
                    var m, r = /<([^>\s]*)[^>]*>/g,
                            stack = [],
                            lasti = 0,
                            result = '';

                    //for each tag, while we don't have enough characters
                    while ((m = r.exec(s)) && n) {
                        //get the text substring between the last tag and this one
                        var temp = s.substring(lasti, m.index).substr(0, n);
                        //append to the result and count the number of characters added
                        result += temp;
                        n -= temp.length;
                        lasti = r.lastIndex;

                        if (n) {
                            result += m[0];
                            if (m[1].indexOf('/') === 0) {
                                //if this is a closing tag, than pop the stack (does not account for bad html)
                                stack.pop();
                            } else if (m[1].lastIndexOf('/') !== m[1].length - 1) {
                                //if this is not a self closing tag than push it in the stack
                                stack.push(m[1]);
                            }
                        }
                    }

                    //add the remainder of the string, if needed (there are no more tags in here)
                    result += s.substr(lasti, n);

                    //fix the unclosed tags
                    while (stack.length) {
                        result += '</' + stack.pop() + '>';
                    }

                    return result;

                }

                self.getName = function (company) {
                    //var name = company.doclist.docs[0].nam_comp_name;
                    //var name = self.allHighlighting()[company.doclist.docs[0].sse_id].nam_comp_name[0];

                    var name = "";
                    try {
                        if (self.allPeople().length !== 0) {
                            if (self.allPeople().grouped.ent_id.groups.length !== 0) {
                                var sse_id = company.doclist.docs[0].sse_id;
                                if (self.allPeople().highlighting !== undefined) {
                                    if (self.allPeople().highlighting[sse_id] !== undefined)
                                        name = self.allPeople().highlighting[sse_id].nam_comp_name;
                                } else
                                    name = company.doclist.docs[0].nam_comp_name;
                            } else if (self.emptySearchSolr().length !== 0 && self.nameSearch().length === 0)
                                name = company.doclist.docs[0].nam_comp_name;
                        } else {
                            name = company.doclist.docs[0].nam_comp_name;
                        }
                        //Trim name if too long
                        if (name !== "") {
                            var text;
                            if (name.length > 1)
                                text = name;
                            else
                                text = name[0];
                            var html = $($.parseHTML(text));
                            if (html.text().length > 35) {
                                var shortName = htmlSubstring(text, 35) + "...";
                                shortName = "<div >" + shortName + "</div>";
                                var shortNameHtml = $($.parseHTML(shortName));
                                shortNameHtml.append('<div class="tooltiptext">' + text + '</div>');
                                name = shortNameHtml[0].outerHTML;
                            }
                        }
                    } catch (e) {
                        //What should we do here?
                    }
                    return name;
                };

                self.getPercentage = function (company) {
                    try {
                        var value = company.doclist.docs[0].score * 100 + "";
                        var percentage = value.substring(0, 5) + "%";
                        return percentage;
                    } catch (e) {
                        console.log("Something is wrong");
                        return "";
                    }

                };

                self.getPercentageColor = function (company) {
                    try {
                        var percentage = company.doclist.docs[0].score * 100;
                        return percentage;
                    } catch (e) {
                        console.log("Something is wrong");
                        return "";
                    }
                };

                self.getHits = function (company) {
                    try {
                        var matches;
                        if (self.allPeople().grouped.ent_id.groups.length !== 0)
                            matches = "Hits: " + company.doclist.numFound;
                        else
                            matches = "";
                        return matches;
                    } catch (e) {
                        console.log("Something is wrong");
                        return "";
                    }
                };

                self.getCountry = function (company) {
                    try {
                        var country;
                        if (company.doclist.docs[0].add_country !== "null")
                            country = "'" + company.doclist.docs[0].add_country + "'";
                        else
                            country = this.countryStatus();
                        return country;
                    } catch (e) {

                    }
                };

                self.getAddress = function (company) {
                    var address = "";
                    try {
                        //For the full address Solr field
                        if (company.doclist.docs[0].add_whole !== "null")
                            address = company.doclist.docs[0].add_whole;
                        else {
                            //For the streetaddress Solr field(up to city level)
                            if (company.doclist.docs[0].add_streetAddress !== "null")
                                address = company.doclist.docs[0].add_streetAddress;
                            else {
                                //room
                                var room = "";
                                if (company.doclist.docs[0].add_room !== "null")
                                    room = company.doclist.docs[0].add_room;
                                //appartment
                                var appartment = "";
                                if (company.doclist.docs[0].add_appartment !== "null")
                                    appartment = ", " + company.doclist.docs[0].add_appartment;
                                //floor
                                var floor = "";
                                if (company.doclist.docs[0].add_floor !== "null")
                                    floor = ", " + company.doclist.docs[0].add_floor;
                                //building
                                var building = "";
                                if (company.doclist.docs[0].add_building !== "null")
                                    building = ", " + company.doclist.docs[0].add_building;
                                //house
                                var house = "";
                                if (company.doclist.docs[0].add_house !== "null")
                                    house = ", " + company.doclist.docs[0].add_house;
                                //street
                                var street = "";
                                if (company.doclist.docs[0].add_street !== "null")
                                    street = ", " + company.doclist.docs[0].add_street;
                                //
                                //Address Result
                                //
                                address = room + appartment + building + house + street;
                            }
                            //district
                            var district = "";
                            if (company.doclist.docs[0].add_district !== "null")
                                district = ", " + company.doclist.docs[0].add_district;
                            //city
                            var city = "";
                            if (company.doclist.docs[0].add_city !== "null")
                                city = ", " + company.doclist.docs[0].add_city;
                            //zipcode
                            var zipCode = "";
                            if (company.doclist.docs[0].add_zipCode !== "null")
                                zipCode = ", " + company.doclist.docs[0].add_zipCode;
                            //state
                            var state = "";
                            if (company.doclist.docs[0].add_state !== "null")
                                state = ", " + company.doclist.docs[0].add_state;
                            //country
                            var country = "";
                            if (company.doclist.docs[0].add_country !== "null")
                                country = ", " + company.doclist.docs[0].add_country;
                            //
                            //Address Result
                            //
                            address = address + district + city + zipCode + state + country;
                        }
                        //delete if there is a comma at the begining of the address
                        address = address.replace(/^,/, '');
                        //delete if there is a comma at the end of the address
                        address = address.replace(/\,$/, "");
                        //show message for no found address
                        if (address === "")
                            address = this.addressStatus();
                        if (address.length > 50) {
                            var shortAddress = address.substring(0, 50) + "...";
                            shortAddress = "<div>" + shortAddress + "</div>";
                            var shortAddressHtml = $($.parseHTML(shortAddress));
                            shortAddressHtml.append('<div class="tooltipAddress">' + address + '</div>');
                            address = shortAddressHtml[0].outerHTML;
                            //address = "<span class='tooltipAddress' title=" + "\"" + address + "\"" + ">" + shortAddress + "</span>";
                            //address= "<span data-bind=\"popover: { options: {title: 'Hover', content:'Hover popover', trigger:'hover'}}\">" + Hover + "</span>"
                            //address = '<span data-bind="attr:{tooltip:"a"}" data-toggle="tooltip" data-placement="top" title="Tooltip on top" >'+shortName+'</span>';
                        }
                        return address;
                    } catch (e) {
                        console.log("Something is wrong");
                        return address;
                    }
                };

                self.getNumFound = function (company) {
                    try {
                        var numFound = company.doclist.numFound;
                        var str = self.found() + ": " + numFound;
                        return str;
                    } catch (e) {
                        onsole.log("Something is wrong");
                        return "";
                    }
                };

                //To load the details page when click on an entity
                self.loadPersonPage = function (comp) {
                    if (comp.doclist.docs[0].ent_id) {
                        //Show loading
                        $("#loadIndicator").show();
                        $("#peoplelistview").addClass("bodyLoadingTransition");

                        id = comp.doclist.docs[0].ent_id;
                        var lang;
                        if (self.languageSel() !== "")
                            lang = self.languageSel().toString().substring(0, 2);
                        else
                            lang = "en";
                        translate = false;
                        history.pushState(null, '', 'index.html?root=details&ent_id=' + id + '&lang=' + lang);
                        oj.Router.sync();

                        var scrollPos;
                        if ($("#globalBody").width() > 1200) {
                            scrollPos = $("#searchedItemsContainer").scrollTop();
                        } else {
                            scrollPos = $("#scrollContainer").scrollTop();
                        }
                        utils.storeState(self.nameSearch(), self.filterTreeCountry(), self.filterTreeList(), self.filterTreeType(), self.start(), scrollPos, self.rows(), self.cardViewPagingDataSource());
                        utils.storeTreeIds(self.workerCountryResult(), self.workerListResult(), self.workerTypeResult());
                        utils.storeTreeMeta(selMetaCountryTree, selMetaTypeTree);
                        //Store SOLR Urls
                        //utils.storeUrl(self.solrUrlReturn(), self.ajaxUrlReturn());
                        //Store SOLR Parameters
                        utils.storeSolr(self.fqCountry(), self.fqList(), self.fqType(), self.calendarSelect(), self.wordPercentage(), self.phrasePercentage(), self.scoreAlgorithm(), self.wordsDistanceAlgorithm());
                        //Store the Filter Tree Panels
                        var sizeTreeCountry = $("#treeCountryLibContainer").css(["width", "height"]);
                        var posTreeCountry = $("#treeCountryLibContainer").position();
                        var visibilityTreeCountry = $("#treeCountryLibContainer").css("display");
                        var sizeTreeList = $("#treeListLibContainer").css(["width", "height"]);
                        var posTreeList = $("#treeListLibContainer").position();
                        var sizeTreeType = $("#treeTypeLibContainer").css(["width", "height"]);
                        var posTreeType = $("#treeTypeLibContainer").position();
                        utils.rememberPositionTrees(sizeTreeCountry, posTreeCountry, sizeTreeList, posTreeList, sizeTreeType, posTreeType);
                    }
                };

                function checkCookie() {
                    var ha;
//                    var ha = utils.readCookie("calendarSelect");
//                    if (ha !== null) {
//                        self.calendarSelect([ha]);
//
//                    }
                    ha = utils.readCookie("wordPercentage");
                    if (ha !== null) {
                        self.wordPercentage = ko.observable(parseInt(ha));

                    }
                    ha = utils.readCookie("phrasePercentage");
                    if (ha !== null) {
                        self.phrasePercentage = ko.observable(parseInt(ha));
                    }
                    ha = utils.readCookie("scoreAlgorithm");
                    if (ha !== null) {
                        self.scoreAlgorithm = ko.observable(ha);
                    }
                    ha = utils.readCookie("wordsDistanceAlgorithm");
                    if (ha !== null) {
                        self.wordsDistanceAlgorithm = ko.observable(ha);
                    }
                }

                self.showFilter = function (event, ui) {
                    if (isHidden === false) {
                        $("#form1 div:first-child").hide(200);
                        $("#form1 span").text("Show Filter choices");
                        isHidden = true;
                    } else {
                        $("#form1 div:first-child").show(200);
                        $("#form1 span").text("Show less");
                        isHidden = false;
                    }
                };

                self.checkFilterHeight = function () {
                    var height = $("#form2").height();
                    var resolutionWidth = $("#globalBody").width();
                    //For when decreasing the width, in order to not create a scrolling event
                    var breakpoint;
                    if (resolutionWidth > 1281) {
                        breakpoint = 70;
                    } else if (resolutionWidth > 1024 && resolutionWidth < 1281) {
                        breakpoint = 60;
                    } else if (resolutionWidth > 700 && resolutionWidth < 1024) {
                        breakpoint = 50;
                    } else if (resolutionWidth < 700) {
                        breakpoint = 45;
                    }

                    if (height > breakpoint) {
                        $("#showMoreText").attr('class', 'show');
                    } else if (height < breakpoint) {
                        $("#form1 div:first-child").show(200);
                        $("#showMoreText").attr('class', 'hide');
                        isHidden = false;
                        $("#form1 span").text("Show less");
                    }
                };

                self.printOptionHandler = function (event, ui) {
                    $("#loadIndicatorForReport").show();
                    var sel = ui.item[0].id;
                    if (sel === "Excel") {
                        self.print("Excel");
                    } else if (sel === "PDF") {
                        self.print("PDF");
                    }

                };

                //print button
                self.print = function (inputChoices) {

                    $.getJSON(AJAXurl)
                            .done(function (people) {
                                if (inputChoices === "PDF") {
                                    var data = people;
//                                    jsreport.serverUrl = 'http://' + window.location.hostname;
                                    jsreport.serverUrl = location.protocol + "//" + window.location.hostname;
                                    var request = {
                                        template: {
                                            shortid: "rJPUhdmv"
                                        }
                                        ,
                                        "Content-Disposition": "attachment; filename=myreport.pdf",
                                        //contentDisposition: "inline; filename=MyFile.pdf",
                                        data: data,
                                        "options": {
                                            "reports": {
                                                "save": false
                                            },
                                            "language": self.langShortID
                                        }
                                    };
                                    jsreport.renderAsync(request).then(function (response) {

                                        if (window.navigator.msSaveOrOpenBlob) {
                                            var fileData = [response];
                                            blobObject = new Blob(fileData);
                                            window.navigator.msSaveOrOpenBlob(blobObject, "myreport.pdf");
                                        } else {
                                            var uInt8Array = new Uint8Array(response);
                                            var i = uInt8Array.length;
                                            var binaryString = new Array(i);
                                            while (i--)
                                            {
                                                binaryString[i] = String.fromCharCode(uInt8Array[i]);
                                            }
                                            var data = binaryString.join('');
                                            var base64 = window.btoa(data);

                                            window.open("data:application/pdf;base64, " + base64, "_blank");
                                            $("#loadIndicatorForReport").hide();
                                        }
                                    });
                                } else if (inputChoices === "Excel") {
                                    var data = people;

                                    jsreport.serverUrl = location.protocol + "//" + window.location.hostname;
                                    var request = {
                                        template: {
                                            shortid: "HJUirFhd"

                                        }
                                        ,
                                        "Content-Disposition": "attachment; filename=myreport.xlsx",
                                        data: data,
                                        "options": {
                                            "reports": {
                                                "save": false
                                            },
                                            "language": self.langShortID

                                        }
                                    };
                                    jsreport.renderAsync(request).then(function (res) {

                                        if (window.navigator.msSaveOrOpenBlob) {
                                            var fileData = [res];
                                            blob = new Blob(fileData);
                                            window.navigator.msSaveOrOpenBlob(blob, "myreport.xlsx");
                                        } else {
                                            var dataView = new DataView(res);
                                            var blob = new Blob([dataView], {type: 'application/vnd.ms-excel'});
                                            saveAs(blob, 'myreport.xlsx');
                                        }
                                        $("#loadIndicatorForReport").hide();
                                    });
                                }

                            })

                            .error(function (e) {

                                utils.showErrorMessageBoard();
                                $("#loadIndicatorForReport").hide();
                            });

                };

            }

            return PeopleViewModel;

        });
