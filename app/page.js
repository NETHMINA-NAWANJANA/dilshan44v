import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">

      {/* NAVBAR */}
      <nav className="home-navbar">

        <div className="home-logo">
          Maths<span>.</span>
        </div>

        <div className="home-nav-buttons">

          <Link
            href="/login"
            className="home-btn home-login-btn"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="home-btn home-register-btn"
          >
            Register
          </Link>

        </div>

      </nav>


      {/* HERO SECTION */}
      <section className="home-hero">

        {/* LEFT CONTENT */}
        <div className="home-hero-content">

          <div className="home-small-title">
            Mathematics • Student Learning
          </div>


          <h1 className="home-teacher-name">
            Dilshan
            <span> Getiyawala</span>
          </h1>


          <p className="home-description">
            Turn mathematics from a problem
            into something you can solve
            without fear.
            <strong>
              {" "}
              Join our Maths journey and
              discover a clearer path to success.
            </strong>
          </p>


          {/* CONTACT DETAILS */}
          <div className="home-contact-box">

            <div className="home-contact-item">
              <div className="home-contact-label">
                Phone
              </div>

              <div className="home-contact-value">
                076 981 5345
              </div>
            </div>


            <div className="home-contact-item">
              <div className="home-contact-label">
                Email
              </div>

              <div className="home-contact-value">
                Getiyawalasir@gmail.com
              </div>
            </div>


            <div className="home-contact-item">
              <div className="home-contact-label">
                Subject
              </div>

              <div className="home-contact-value">
                Maths
              </div>
            </div>


            <div className="home-contact-item">
              <div className="home-contact-label">
                Classes
              </div>

              <div className="home-contact-value">
                Grade 6 – 11
              </div>
            </div>

          </div>


          {/* SOCIAL MEDIA LINKS */}
          <div className="home-social-links">

            <a
              href="https://wa.me/94769815345"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
            >
              <img
                src="/whatsapp.png"
                alt="WhatsApp"
                className="home-social-icon"
              />
            </a>


            <a
              href="https://www.youtube.com/@Getiyawalasir"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              <img
                src="/youtube.png"
                alt="YouTube"
                className="home-social-icon"
              />
            </a>


            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <img
                src="/facebook.png"
                alt="Facebook"
                className="home-social-icon"
              />
            </a>


            <a
              href="https://www.tiktok.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
            >
              <img
                src="/tiktok.png"
                alt="TikTok"
                className="home-social-icon"
              />
            </a>

          </div>

        </div>


        {/* RIGHT TEACHER PHOTO */}
        <div className="home-teacher-area">

          <div className="home-teacher-glow" />

          <img
            src="/sir.png"
            alt="Dildhan Getiyawala"
            className="home-teacher-image"
          />

          <div className="home-teacher-tag">

            <small>
              Mathematics Teacher
            </small>

            <strong>
              Dildhan Getiyawala
            </strong>

          </div>

        </div>

      </section>

    </main>
  );
}
