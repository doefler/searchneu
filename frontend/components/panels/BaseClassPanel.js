/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import React from 'react';
import PropTypes from 'prop-types';

import RequisiteBranch from '../../../common/classModels/RequisiteBranch';
import Keys from '../../../common/Keys';
import css from './BaseClassPanel.css';
import macros from '../macros';

class BaseClassPanel extends React.Component {
  static propTypes = {
    aClass: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);

    let sectionsShownByDefault;
    if (this.constructor.sectionsShownByDefault) {
      sectionsShownByDefault = this.constructor.sectionsShownByDefault;
    } else {
      sectionsShownByDefault = macros.sectionsShownByDefault;
    }

    // If this is desktop and there is exactly one section hidden by the button, just show them all.
    if (!macros.isMobile && this.props.aClass.sections.length === sectionsShownByDefault + 1) {
      sectionsShownByDefault++;
    }

    this.state = {
      prereqsPage : 0,
      coreqsPage: 0,
      prereqsForPage: 0,
      optPrereqsForPage: 0,
      renderedSections: this.props.aClass.sections.slice(0, sectionsShownByDefault),
      unrenderedSections: this.props.aClass.sections.slice(sectionsShownByDefault),
    };
  }

  onShowMoreClick = () => {
    macros.log('Adding more sections to the bottom.');

    // Get the length of the our sections
    const rendered = this.state.renderedSections;
    const unrendered = this.state.unrenderedSections;

    const showAmount = (rendered.length > macros.sectionsShowAllThreshold) ?
      unrendered.length : macros.sectionsAddedWhenShowMoreClicked;

    this.setState({
      renderedSections: rendered.concat(unrendered.slice(0, showAmount)),
      unrenderedSections: unrendered.slice(showAmount, unrendered.length),
    });
  }

  onReqClick(reqType, childBranch, event) {
    // Create the React element and add it to retVal
    const searchEvent = new CustomEvent(macros.searchEvent, { detail: `${childBranch.subject} ${childBranch.classId}` });
    window.dispatchEvent(searchEvent);
    event.preventDefault();

    const classCode = `${childBranch.subject} ${childBranch.classId}`;

    let reqTypeString;

    if (reqType === macros.prereqTypes.PREREQ) {
      reqTypeString = 'Prerequisite';
    } else if (reqType === macros.prereqTypes.COREQ) {
      reqTypeString = 'Corequisite';
    } else if (reqType === macros.prereqTypes.PREREQ_FOR) {
      reqTypeString = 'Required Prerequisite For';
    } else if (reqType === macros.prereqTypes.OPT_PREREQ_FOR) {
      reqTypeString = 'Optional Prerequisite For';
    } else {
      macros.error('unknown type.', reqType);
      return null;
    }

    macros.logAmplitudeEvent('Requisite Click', {
      type: reqTypeString, subject: childBranch.subject, classId: childBranch.classId, classCode: classCode,
    });

    return null;
  }

  // Render the Show More.. Button
  // This is the same on both desktop and mobile.
  getShowMoreButton() {
    if (this.state.unrenderedSections.length > 0) {
      return (
        <div className={ css.showMoreButton } role='button' tabIndex={ 0 } onClick={ this.onShowMoreClick }>
          Show More...
        </div>
      );
    }
    return null;
  }

  getCreditsString() {
    // Figure out the credits string
    if (this.props.aClass.maxCredits === this.props.aClass.minCredits) {
      return `${this.props.aClass.minCredits} credits`;
    }
    return `${this.props.aClass.minCredits} to ${this.props.aClass.maxCredits} credits`;
  }

  // The argument wrapper func is optional
  // If it exists, it is called on when formatting the classes
  // It is called with a class
  // and can return either a string or a react element.
  getReqsString(reqType, aClass = this.props.aClass) {
    const retVal = [];

    // Keep track of which subject+classId combonations have been used so far.
    // If you encounter the same subject+classId combo in the same loop, skip the second one.
    // This is because there is no need to show (eg. CS 2500 and CS 2500 (hon)) in the same group
    // because only the subject and the classId are going to be shown.
    const processedSubjectClassIds = {};

    let childNodes;

    if (reqType === macros.prereqTypes.PREREQ) {
      childNodes = aClass.prereqs;
    } else if (reqType === macros.prereqTypes.COREQ) {
      childNodes = aClass.coreqs;
    } else if (reqType === macros.prereqTypes.PREREQ_FOR) {
      if (!aClass.prereqsFor) {
        childNodes = { values:[] };
      } else {
        childNodes = aClass.prereqsFor;
      }
    } else if (reqType === macros.prereqTypes.OPT_PREREQ_FOR) {
      if (!aClass.optPrereqsFor) {
        childNodes = { values:[] };
      } else {
        childNodes = aClass.optPrereqsFor;
      }
    } else {
      macros.error('Invalid prereqType', reqType);
    }

    childNodes.values.forEach((childBranch) => {
      // If the childBranch is a class
      if (!(childBranch instanceof RequisiteBranch)) {
        if (childBranch.isString) {
          // Skip if already seen
          if (processedSubjectClassIds[childBranch.desc]) {
            return;
          }
          processedSubjectClassIds[childBranch.desc] = true;


          retVal.push(childBranch.desc);
        } else {
          // Skip if already seen
          if (processedSubjectClassIds[childBranch.subject + childBranch.classId]) {
            return;
          }
          processedSubjectClassIds[childBranch.subject + childBranch.classId] = true;

          //   href={"/" + encodeURIComponent(childBranch.subject + ' ' + childBranch.classId)}

          // let thethiing ={
          //   host: aClass.host,
          //   termId: aClass.termId,
          //   subject: childBranch.subject,
          //   classUid: childBranch.classUid,
          // };

          // let oldthing = Keys.create(childBranch).getHash();

          // if (oldthing !== Keys.create(thethiing).getHash()) {
          //   debugger
          // }

          // When adding support for right click-> open in new tab, we might also be able to fix the jsx-a11y/anchor-is-valid errors.
          // They are disabled for now.


          const hash = `${childBranch.subject} ${childBranch.classId}`;

          const element = (
            <a
              key={ hash }
              role='link'
              tabIndex={ 0 }
              onClick={ (event) => { this.onReqClick(reqType, childBranch, event); } }
              className={ css.reqClassLink }
            >
              {`${childBranch.subject} ${childBranch.classId}`}
            </a>);

          retVal.push(element);
        }
      } else if (reqType === macros.prereqTypes.PREREQ) {
        // Figure out how many unique classIds there are in the prereqs.
        const allClassIds = {};
        for (const node of childBranch.prereqs.values) {
          allClassIds[node.classId] = true;
        }

        // If there is only 1 prereq with a unique classId, don't show the parens.
        if (Object.keys(allClassIds).length === 1) {
          retVal.push(this.getReqsString(macros.prereqTypes.PREREQ, childBranch));
        } else {
          retVal.push(['(', this.getReqsString(macros.prereqTypes.PREREQ, childBranch), ')']);
        }
      } else {
        macros.error('Branch found and parsing coreqs?', childBranch);
      }
    });


    // Now insert the type divider ("and" vs "or") between the elements.
    // If we're parsing prereqsFor, we should use just a comma as a separator.
    // Can't use the join in case the objects are react elements
    if (reqType === macros.prereqTypes.PREREQ_FOR || reqType === macros.prereqTypes.OPT_PREREQ_FOR) {
      for (let i = retVal.length - 1; i >= 1; i--) {
        retVal.splice(i, 0, ', ');
      }
    } else {
      let type;
      if (reqType === macros.prereqTypes.PREREQ) {
        type = aClass.prereqs.type;
      } else if (reqType === macros.prereqTypes.COREQ) {
        type = aClass.coreqs.type;
      }
      for (let i = retVal.length - 1; i >= 1; i--) {
        retVal.splice(i, 0, ` ${type} `);
      }
    }

    if (retVal.length === 0) {
      return (<span className={ css.dynamicText }>None</span>);
    }

    // retVal = retVal.join(' ' + this.prereqs.type + ' ')

    return retVal;
  }

  /**
   * Returns the 'page' of the specified prerequisite.
   *
   * @param {prereqTypes} prereqType type of prerequisite.
   */
  getStateValue(prereqType) {
    switch (prereqType) {
      case macros.prereqTypes.PREREQ:
        return this.state.prereqsPage;
      case macros.prereqTypes.COREQ:
        return this.state.coreqsPage;
      case macros.prereqTypes.PREREQ_FOR:
        return this.state.prereqsForPage;
      case macros.prereqTypes.OPT_PREREQ_FOR:
        return this.state.optPrereqsForPage;
      default:
        return -1;
    }
  }

  /**
   * Returns how many elements we should return from our array of prerequisites.
   * Note that we mutliply our value by two because every other value is ', '
   *
   * @param {prereqTypes} prereqType type of prerequisite.
   */
  getShowAmount(prereqType) {
    const classesShownByDefault = 5;
    const stateValue = this.getStateValue(prereqType);
    return 2 * classesShownByDefault *
    (stateValue + 1);
  }

  /**
   * Returns the array that we should be displaying
   *
   * @param {prereqTypes} prereqType type of prerequisite.
   */
  optionalDisplay(prereqType) {
    const data = this.getReqsString(prereqType, this.props.aClass);

    if (Array.isArray(data)) {
      if (this.getStateValue(prereqType) >= 3) {
        return data;
      }

      const showAmt = this.getShowAmount(prereqType);

      if (showAmt < data.length) {
        data.length = showAmt;
      }

      if (typeof data[data.length - 1] === 'string') {
        data.length -= 1;
      }
    }

    return data;
  }

  /**
   * Returns the 'Show More' button of the prereqType, if one is needed.
   * @param {prereqTypes} prereqType type of prerequisite.
   */
  showMore(prereqType) {
    const data = this.getReqsString(prereqType, this.props.aClass);

    if (!Array.isArray(data) ||
      this.getStateValue(prereqType) >= 3 ||
      this.getShowAmount(prereqType) >= data.length) {
      return null;
    }

    return (
      <div
        className={ `${css.prereqShowMore} ${css.dynamicText}` }
        tabIndex={ 0 }
        role='button'
        onClick={ () => {
          this.setState((prevState) => {
            switch (prereqType) {
              case macros.prereqTypes.PREREQ:
                return { prereqsPage: prevState.prereqsPage + 1 };
              case macros.prereqTypes.COREQ:
                return { prereqsPage: prevState.coreqsPage + 1 };
              case macros.prereqTypes.PREREQ_FOR:
                return { prereqsForPage: prevState.prereqsForPage + 1 };
              case macros.prereqTypes.OPT_PREREQ_FOR:
                return { optPrereqsForPage: prevState.optPrereqsForPage + 1 };
              default:
                return macros.error(`invalid prereq type!: ${prereqType}`);
            }
          });
        } }
      >Show More
        <span className={ css.prereqShowMoreArrow } />
      </div>
    );
  }

  // Just used for testing. Not used anywhere in the frontend.
  render() {
    return (
      <div>
        <div>
          {this.state.renderedSections.map((aClass) => {
            return Keys.create(aClass).getHash();
          })}
        </div>
        <div>
          {this.state.unrenderedSections.map((aClass) => {
            return Keys.create(aClass).getHash();
          })}
        </div>
      </div>
    );
  }
}

export default BaseClassPanel;
