import React from 'react';

import './contact.module.css';

const Contact: React.FC = () => {
  return (
    <div>
      <section className="hero">
        <div className="nav">
          <p>
            The freelance directory <br />a thomas aufresne and isaac powell
            creation
          </p>
        </div>

        <div className="header">
          <div className="header-text">
            <h1>La Piga</h1>
          </div>
          <div className="cta">
            <button id="toggle">Apply now</button>
          </div>
        </div>

        <div className="tagline">
          <p>
            Indépendant; à la pige; adj Release <br />
            v1.0 coming soon
          </p>
        </div>

        <div className="links">
          <button>Instagram</button>
          <button>Twitter</button>
        </div>
      </section>

      <div className="overlay">
        <div className="col">
          <div className="logo">
            <a href="#">La Pige</a>
          </div>

          <div className="form">
            <form>
              <label htmlFor="fname">Name*</label>
              <br />
              <input
                type="text"
                id="fname"
                name="fname"
                placeholder="first + surname"
              />
              <br />
              <br />

              <label htmlFor="lname">Location*</label>
              <br />
              <input
                type="text"
                id="lname"
                name="lname"
                placeholder="e.g france"
              />
              <br />
              <br />

              <label htmlFor="website">Website</label>
              <br />
              <input
                type="text"
                id="website"
                name="website"
                placeholder="https://"
              />
              <br />
              <br />

              <label htmlFor="jobs">Disciplines</label>
              <br />
              <div className="jobs">
                <div className="job-items">
                  <div className="item">
                    <input type="checkbox" />
                    <label>Digital Design</label>
                    <br />
                  </div>
                  <div className="item">
                    <input type="checkbox" />
                    <label>Front-end</label>
                    <br />
                  </div>
                  <div className="item">
                    <input type="checkbox" />
                    <label>Webgl</label>
                    <br />
                  </div>
                  <div className="item">
                    <input type="checkbox" />
                    <label>Photography</label>
                    <br />
                  </div>
                  <div className="item">
                    <input type="checkbox" />
                    <label>Illustration</label>
                    <br />
                  </div>
                </div>
                <div className="job-items">
                  <div className="item">
                    <input type="checkbox" />
                    <label>Brand Design</label>
                    <br />
                  </div>
                  <div className="item">
                    <input type="checkbox" />
                    <label>Bakc-end</label>
                    <br />
                  </div>
                  <div className="item">
                    <input type="checkbox" />
                    <label>3D</label>
                    <br />
                  </div>
                  <div className="item">
                    <input type="checkbox" />
                    <label>Motion</label>
                    <br />
                  </div>
                  <div className="item">
                    <input type="checkbox" />
                    <label>Strategy</label>
                    <br />
                  </div>
                </div>
              </div>

              <button>Send Application</button>
            </form>
          </div>
        </div>
        <div className="col">
          <div className="copy">
            <p>[ get featured ]</p>
            <p id="back">[ back ]</p>
          </div>
          <div className="about">
            <p>
              To be considered for a listing on La Pige, please fill out your
              details opposite. Each application will be carefully reviewed and
              vetted while v1.0 release is being worked on.
            </p>
          </div>

          <div className="send">
            <h1>Apply</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
