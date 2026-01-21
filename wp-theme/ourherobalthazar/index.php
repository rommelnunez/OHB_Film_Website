<?php
/**
 * Template Name: Home Page
 * Our Hero, Balthazar - Main Template
 */

get_header();

// Get customizer values
$hero_image = get_theme_mod('hero_image', get_template_directory_uri() . '/assets/images/hero-official.jpg');
$trailer_url = get_theme_mod('trailer_url', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
$synopsis = get_theme_mod('synopsis', '');
?>

  <!-- Full Screen Hero Section -->
  <div class="cinematic-frame" id="hero">
    <div class="hero-background" style="background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('<?php echo esc_url($hero_image); ?>') center/cover no-repeat;"></div>
    
    <div class="nav-overlay">
      <nav class="minimal-nav">
        <ul>
          <li><a href="#about">Trailer</a></li>
          <li><a href="#tickets">Tickets</a></li>
          <li><a href="#cast">Cast & Crew</a></li>
        </ul>
      </nav>
    </div>

    <div class="hero-overlay">
      <h1 class="film-title"><?php bloginfo('name'); ?></h1>
      <div class="cta-group">
        <a href="#about" class="btn-minimal">Watch Trailer</a>
        <a href="#tickets" class="btn-minimal">Get Tickets</a>
      </div>
    </div>
  </div>

  <!-- Trailer Section -->
  <section id="about" class="section">
    <h2 class="section-title">Trailer</h2>
    <div style="aspect-ratio: 16/9; background: #111; width: 100%; max-width: 1000px; margin: 0 auto;">
      <iframe width="100%" height="100%" src="<?php echo esc_url($trailer_url); ?>" frameborder="0" allowfullscreen></iframe>
    </div>
    <div style="margin-top: 4rem; text-align: center; max-width: 800px; margin-left: auto; margin-right: auto;">
      <p style="font-size: 1.1rem; line-height: 1.8; opacity: 0.8;">
        <?php echo esc_html($synopsis); ?>
      </p>
    </div>
  </section>

  <!-- Ticketing Section -->
  <section id="tickets" class="section">
    <h2 class="section-title">Initial Launch - NY & LA</h2>
    <div class="gallery-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <!-- New York -->
      <div class="gallery-item" style="display: flex; flex-direction: column; padding: 2rem; border: 1px solid rgba(255,255,255,0.1); justify-content: space-between; height: 300px;">
        <div>
          <h3 style="letter-spacing: 0.2em; text-transform: uppercase; font-size: 1.2rem;">New York</h3>
          <p style="font-size: 0.8rem; margin-top: 1rem; opacity: 0.6;">OPENING JANUARY 23, 2026</p>
        </div>
        <a href="#" class="btn-minimal" style="width: 100%; text-align: center;">Find Showtimes</a>
      </div>
      <!-- Los Angeles -->
      <div class="gallery-item" style="display: flex; flex-direction: column; padding: 2rem; border: 1px solid rgba(255,255,255,0.1); justify-content: space-between; height: 300px;">
        <div>
          <h3 style="letter-spacing: 0.2em; text-transform: uppercase; font-size: 1.2rem;">Los Angeles</h3>
          <p style="font-size: 0.8rem; margin-top: 1rem; opacity: 0.6;">OPENING JANUARY 23, 2026</p>
        </div>
        <a href="#" class="btn-minimal" style="width: 100%; text-align: center;">Find Showtimes</a>
      </div>
    </div>
  </section>

  <!-- Scheduled Q&As Section -->
  <section id="events" class="section">
    <h2 class="section-title">Scheduled Q&As</h2>
    <div class="events-container">
      <?php
      $qa_events = new WP_Query(array(
        'post_type' => 'qa_event',
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'ASC'
      ));
      
      if ($qa_events->have_posts()) :
        while ($qa_events->have_posts()) : $qa_events->the_post();
          $event_date = get_post_meta(get_the_ID(), '_event_date', true);
          $event_location = get_post_meta(get_the_ID(), '_event_location', true);
          $event_time = get_post_meta(get_the_ID(), '_event_time', true);
      ?>
      <div class="event-card">
        <div class="event-date"><?php echo esc_html($event_date); ?></div>
        <h3 class="event-title"><?php the_title(); ?></h3>
        <p class="event-location"><?php echo esc_html($event_location); ?></p>
        <p class="event-time"><?php echo esc_html($event_time); ?></p>
      </div>
      <?php
        endwhile;
        wp_reset_postdata();
      else :
      ?>
      <!-- Fallback if no events -->
      <div class="event-card">
        <div class="event-date">JANUARY 24, 2026</div>
        <h3 class="event-title">Opening Night Q&A with Director Oscar Boyson</h3>
        <p class="event-location">Angelika Film Center, New York</p>
        <p class="event-time">7:30 PM Screening + Q&A</p>
      </div>
      <?php endif; ?>
    </div>
  </section>

  <!-- Press Quotes -->
  <section id="press" class="section">
    <h2 class="section-title">Press</h2>
    <div class="quote-container">
      <?php
      $press_quotes = new WP_Query(array(
        'post_type' => 'press_quote',
        'posts_per_page' => -1,
        'orderby' => 'menu_order',
        'order' => 'ASC'
      ));
      
      if ($press_quotes->have_posts()) :
        while ($press_quotes->have_posts()) : $press_quotes->the_post();
          $quote_source = get_post_meta(get_the_ID(), '_quote_source', true);
      ?>
      <div style="margin-bottom: 4rem;">
        <p class="quote-text"><?php the_content(); ?></p>
        <p class="quote-author">— <?php echo esc_html($quote_source); ?></p>
      </div>
      <?php
        endwhile;
        wp_reset_postdata();
      else :
      ?>
      <!-- Fallback quotes -->
      <div style="margin-bottom: 4rem;">
        <p class="quote-text">"Buddy movie for our time. It's a cutting, audacious, and at times astonishing movie."</p>
        <p class="quote-author">— VARIETY</p>
      </div>
      <?php endif; ?>
    </div>
  </section>

  <!-- Cast Section -->
  <section id="cast" class="section">
    <h2 class="section-title">Cast & Crew</h2>
    <div class="cast-grid">
      <?php
      $cast_crew = new WP_Query(array(
        'post_type' => 'cast_crew',
        'posts_per_page' => -1,
        'orderby' => 'menu_order',
        'order' => 'ASC'
      ));
      
      if ($cast_crew->have_posts()) :
        while ($cast_crew->have_posts()) : $cast_crew->the_post();
          $member_role = get_post_meta(get_the_ID(), '_member_role', true);
      ?>
      <div class="cast-card">
        <h3><?php the_title(); ?></h3>
        <p class="cast-role"><?php echo esc_html($member_role); ?></p>
        <div class="cast-bio"><?php the_content(); ?></div>
      </div>
      <?php
        endwhile;
        wp_reset_postdata();
      else :
      ?>
      <!-- Fallback cast -->
      <div class="cast-card">
        <h3>Jaeden Martell</h3>
        <p class="cast-role">Balthazar</p>
        <div class="cast-bio">Known for his roles in IT and Knives Out, Martell brings depth and nuance to the complex character of Balthazar.</div>
      </div>
      <?php endif; ?>
    </div>
  </section>

  <!-- Billing Block & Footer -->
  <footer>
    <div class="container">
      
      <ul class="footer-links">
        <li><a href="https://www.instagram.com/ourherobalthazar/" target="_blank">Instagram</a></li>
        <li><a href="#">Twitter</a></li>
        <li><a href="#">Facebook</a></li>
        <li><a href="mailto:contact@picturehouse.com">Contact</a></li>
      </ul>
      
      <div class="copyright">
        &copy; <?php echo date('Y'); ?> Picturehouse. All Rights Reserved.<br>
        <a href="#" style="color: inherit; text-decoration: none; margin-top: 10px; display: inline-block;">Terms & Conditions | Privacy Policy</a>
      </div>
    </div>
  </footer>

<?php get_footer(); ?>
