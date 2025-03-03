/**
 * Base Controller.
 *
 * Common and inheritable methods for all other controllers, including: Model methods and shortcuts;
 * Router, History handling and Navigation; Dialog-fragments management with their own controller.
 *
 * @file This files describes the app Base Controller.
 * @author Tomas A. Sanchez
 * @since 07.27.2021
 */

import Controller from "sap/ui/core/mvc/Controller";
import History from "sap/ui/core/routing/History";
import UIComponent from "sap/ui/core/UIComponent";
import Model from "sap/ui/model/Model";
import JSONModel from "sap/ui/model/json/JSONModel";
import View from "sap/ui/core/mvc/View";
//import ResourceModel from "sap/ui/model/resource/ResourceModel";
import Router from "sap/ui/core/routing/Router";
import UI5Element from "sap/ui/core/Element";
import Dialog from "sap/m/Dialog";

interface IDictionary {
  [index: string]: any;
}

/**
 * Global fragments' ID list.
 * @private
 */
const _fragments = {} as IDictionary;

/**
 * The BaseController.
 *
 * @namespace com.ts.tsReport
 */
export default class BaseController extends Controller {
  /* =========================================================== */
  /* Model Methods                                               */
  /* =========================================================== */
  /**
   * Convenience method for getting the view model by name in every controller of the application.
   *
   * @public
   * @param {string} sName the model name
   * @returns {sap.ui.model.Model} the model instance
   */
  public getModel(modelName?: string): Model {
    return modelName
      ? this.getView().getModel(modelName)
      : this.getView().getModel();
  }

  /**
   * Convenience method for setting the view model in every controller of the application.
   *
   * @public
   * @param {sap.ui.model.Model} oModel the model instance
   * @param {string} sName the model name
   * @returns {sap.ui.mvc.View} the view instance
   */
  public setModel(model: JSONModel, modelName: string): View {
    return this.getView().setModel(model, modelName);
  }

  /**
   * Convenience method for getting the resource bundle.
   * @public
   * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
   */
  // public getResourceBundle(): ResourceModel {
  //   return this.getOwnerComponent().getModel("i18n").getResourceBundle();
  // }

  /* =========================================================== */
  /* Navigation methods                                          */
  /* =========================================================== */

  /**
   * Convenience method for accessing the router in every controller of the application.
   * @public
   * @returns {sap.ui.core.routing.Router} the router for this component
   */
  public getRouter(): Router {
    return UIComponent.getRouterFor(this);
  }

  /**
   * Method for navigation to specific view
   * @public
   * @param {string} psTarget Parameter containing the string for the target navigation
   * @param {mapping} pmParameters? optional mapping Parameters for navigation
   * @param {object} oComponentTargetInfo? optional component target information
   * @param {boolean} pbReplace? Defines if the hash should be replaced (no browser history entry) or set (browser history entry)
   */
  public navTo(
    psTarget: string,
    pmParameters?: object,
    oComponentTargetInfo?: object,
    pbReplace?: boolean
  ): void {
    this.getRouter().navTo(
      psTarget,
      pmParameters,
      oComponentTargetInfo,
      pbReplace
    );
  }

  /**
   * Event handler for navigating back.
   * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
   * If not, it will replace the current entry of the browser history with the master route.
   * @public
   */
  public onNavBack(): void {
    var sPreviousHash = History.getInstance().getPreviousHash();

    if (sPreviousHash !== undefined) {
      window.history.back();
    } else {
      this.getRouter().navTo("appHome", {}, {}, true /*no history*/);
    }
  }

  /* =========================================================== */
  /* Fragments Handling                                          */
  /* =========================================================== */

  /**
   * Convenince method for openning a Dialog Fragment with a controller.
   * @public
   * @param {string} sName the fragment name
   * @param {sap.ui.mvc.Model} model to be set(optional)
   * @param {boolean} updateModelAllways let the function know if it has to update the model every time it opens the dialog or only the first time.
   * @param {function} callbak a function in the controller from where it’s called which can be executed from the fragment controller
   * @param {obejct} data passed from the main view to the fragment
   */
  public openDialog(
    sName: string,
    model?: Model,
    updateModelAlways?: boolean,
    callback?: () => void,
    data?: object
  ): void {
    if (sName.indexOf(".") > 0) {
      var aViewName = sName.split(".");
      sName = sName.substr(sName.lastIndexOf(".") + 1);
    } else {
      //current folder
      aViewName = this.getView().getViewName().split("."); // view.login.Login
    }

    aViewName.pop();
    var sViewPath = aViewName.join("."); // view.login

    if (sViewPath.toLowerCase().indexOf("fragments") > 0) {
      sViewPath += ".";
    } else {
      sViewPath += ".fragments.";
    }

    var id: string = this.getView().getId() + "-" + sName;
    if (!_fragments[id]) {
      //create controller
      var sControllerPath = sViewPath.replace("view", "controller");

      _fragments[id] = { fragment: {}, controller: {} };

      Controller.create({ name: sControllerPath + sName })
        .then((oController: Controller) => {
          _fragments[id].controller = oController;
          this.createDialogFragment(
            id,
            sViewPath + sName,
            oController,
            model,
            updateModelAlways,
            callback,
            data
          );
        })
        .catch((reason: any) => {
          _fragments[id].controller = this;
          this.createDialogFragment(
            id,
            sViewPath + sName,
            this,
            model,
            updateModelAlways,
            callback,
            data
          );
        });
    } else _fragments[id].fragment.open();
  }

  /**
   * Convenince method for closing all opened Fragments.
   * @function
   * @public
   */
  public closeFragments(): void {
    /*
			This makes it easy for a close button in each fragment.
       It just calls this function and it will close the open fragments. (In case the fragment contains a dialog.)
		*/
    for (var f in _fragments) {
      if (
        _fragments[f]["fragment"] &&
        _fragments[f].fragment["isOpen"] &&
        _fragments[f].fragment.isOpen()
      ) {
        _fragments[f].fragment.close();
      }
    }
  }

  /**
   * Convenince method for getting an specific fragment
   * @public
   * @param {string} fragment name
   */
  public getFragment(fragment: string): any {
    return _fragments[this.getView().getId() + "-" + fragment];
  }

  /**
   * Convenince method for getting a control from in the fragment
   * @public
   * @param {sap.ui.mvc.Controller}
   * @param {string} id of control
   * Use example:
   *	var oButton = this.fragmentById(this.parent,"button0");
   */
  public fragmentById(parent: Controller, id: string): UI5Element {
    var latest = this.getMetadata().getName().split(".")[
      this.getMetadata().getName().split(".").length - 1
    ];
    return sap.ui
      .getCore()
      .byId(parent.getView().getId() + "-" + latest + "--" + id);
  }

  /**
   * Adds a history entry in the FLP page history
   * @public
   * @param {object} oEntry An entry object to add to the hierachy array as expected from the ShellUIService.setHierarchy method
   * @param {boolean} bReset If true resets the history before the new entry is added
   */
  public addHistoryEntry: any = (() => {
    var aHistoryEntries: any[] = [];

    return (oEntry: any, bReset: boolean) => {
      if (bReset) {
        aHistoryEntries = [];
      }

      var bInHistory = aHistoryEntries.some(function (oHistoryEntry) {
        return oHistoryEntry.intent === oEntry.intent;
      });

      if (!bInHistory) {
        aHistoryEntries.push(oEntry);
        this.getOwnerComponent()
          .getService("ShellUIService")
          .then(function (oService: any) {
            oService.setHierarchy(aHistoryEntries);
          });
      }
    };
  })();

  /* =========================================================== */
  /* Private methods                                             */
  /* =========================================================== */

  /**
   * Creates a new Dialog.
   * @private
   * @param {string} sID the fragment ID
   * @param {string} name the fragment view-name
   * @param {sap.ui.mvc.Controller} oController the controller to be set on the fragment
   * @param {sap.ui.model.Model} model an optional model to be set on the fragment
   * @param {boolean} updateModelAllways an optional flag for updating the model allways
   * @param {()=> void} callback an optional callback function
   * @param {object} data an optional object to be passed as data
   */
  private createDialogFragment(
    sID: string,
    name: string,
    oController: Controller,
    model?: Model,
    updateModelAllways?: boolean,
    callback?: () => void,
    data?: object
  ): void {
    _fragments[sID] = {
      fragment: sap.ui.require(
        ["sap/ui/core/Fragment"],
        (fragmentClass: any) => {
          fragmentClass
            .load({
              id: sID,
              name: name,
              controller: oController,
            })
            .then((oFragment: Dialog) => {
              // version >= 1.20.x
              _fragments[sID].fragment = oFragment;
              this.getView().addDependent(oFragment);
              var fragment = oFragment;

              _fragments[sID].controller = oController;

              if (model && updateModelAllways) {
                fragment.setModel(model);
              }
              if (oController && oController !== this) {
                _fragments[sID].controller.onBeforeShow(
                  oController,
                  fragment,
                  callback,
                  data
                );
              }

              setTimeout(function () {
                fragment.open();
              }, 100);
            });
        }
      ),
    };
  }
}
