import React, {Component} from 'react';
import {connect} from 'react-redux';
/*
 * We need "if(!this.props.user)" because we set state to null by default
 * */

class UserDetail extends Component {
    render() {
        if (!this.props.user) {
            return (<div className="thumbnail">
                      <h5>select an avenger...
                      </h5>
                    </div>);
        }
        return (
            <div>
              <div className="thumbnail">
                <h3>{this.props.user.first} {this.props.user.last}</h3>
                <img className="imageDetails" src={this.props.user.thumbnail} />
                <h4>Age: {this.props.user.age}</h4>
                <h4>Description: {this.props.user.description}</h4>
              </div>
            </div>
        );
    }
}

// "state.activeUser" is set in reducers/index.js
function mapStateToProps(state) {
    return {
        user: state.activeUser
    };
}

export default connect(mapStateToProps)(UserDetail);
