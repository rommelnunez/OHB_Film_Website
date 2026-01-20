<?php
/**
 * Theme Functions
 * Our Hero, Balthazar WordPress Theme
 */

// Enqueue styles and scripts
function ohb_enqueue_assets() {
    wp_enqueue_style('ohb-main-style', get_template_directory_uri() . '/assets/css/styles.css', array(), '1.0');
    wp_enqueue_script('ohb-main-script', get_template_directory_uri() . '/assets/js/main.js', array(), '1.0', true);
    
    // Google Fonts
    wp_enqueue_style('google-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap', array(), null);
}
add_action('wp_enqueue_scripts', 'ohb_enqueue_assets');

// Theme support
function ohb_theme_support() {
    add_theme_support('title-tag');
    add_theme_support('custom-logo');
    add_theme_support('post-thumbnails');
}
add_action('after_setup_theme', 'ohb_theme_support');

// Register custom post types
function ohb_register_post_types() {
    // Q&A Events
    register_post_type('qa_event', array(
        'labels' => array(
            'name' => 'Q&A Events',
            'singular_name' => 'Q&A Event',
            'add_new_item' => 'Add New Event',
            'edit_item' => 'Edit Event',
        ),
        'public' => true,
        'has_archive' => false,
        'menu_icon' => 'dashicons-calendar-alt',
        'supports' => array('title', 'editor'),
        'show_in_rest' => true,
    ));
    
    // Press Quotes
    register_post_type('press_quote', array(
        'labels' => array(
            'name' => 'Press Quotes',
            'singular_name' => 'Press Quote',
            'add_new_item' => 'Add New Quote',
            'edit_item' => 'Edit Quote',
        ),
        'public' => true,
        'has_archive' => false,
        'menu_icon' => 'dashicons-format-quote',
        'supports' => array('title', 'editor'),
        'show_in_rest' => true,
    ));
    
    // Cast & Crew
    register_post_type('cast_crew', array(
        'labels' => array(
            'name' => 'Cast & Crew',
            'singular_name' => 'Cast/Crew Member',
            'add_new_item' => 'Add New Member',
            'edit_item' => 'Edit Member',
        ),
        'public' => true,
        'has_archive' => false,
        'menu_icon' => 'dashicons-groups',
        'supports' => array('title', 'editor', 'thumbnail'),
        'show_in_rest' => true,
    ));
}
add_action('init', 'ohb_register_post_types');

// Add custom fields
function ohb_add_meta_boxes() {
    // Q&A Event meta
    add_meta_box('qa_event_details', 'Event Details', 'ohb_qa_event_meta', 'qa_event', 'normal', 'high');
    
    // Press Quote meta
    add_meta_box('press_quote_details', 'Quote Details', 'ohb_press_quote_meta', 'press_quote', 'normal', 'high');
    
    // Cast/Crew meta
    add_meta_box('cast_crew_details', 'Member Details', 'ohb_cast_crew_meta', 'cast_crew', 'normal', 'high');
}
add_action('add_meta_boxes', 'ohb_add_meta_boxes');

// Q&A Event meta box
function ohb_qa_event_meta($post) {
    wp_nonce_field('ohb_qa_event_meta', 'ohb_qa_event_nonce');
    $date = get_post_meta($post->ID, '_event_date', true);
    $location = get_post_meta($post->ID, '_event_location', true);
    $time = get_post_meta($post->ID, '_event_time', true);
    ?>
    <p>
        <label>Event Date:</label><br>
        <input type="text" name="event_date" value="<?php echo esc_attr($date); ?>" style="width:100%;" placeholder="JANUARY 24, 2026">
    </p>
    <p>
        <label>Location:</label><br>
        <input type="text" name="event_location" value="<?php echo esc_attr($location); ?>" style="width:100%;" placeholder="Angelika Film Center, New York">
    </p>
    <p>
        <label>Time:</label><br>
        <input type="text" name="event_time" value="<?php echo esc_attr($time); ?>" style="width:100%;" placeholder="7:30 PM Screening + Q&A">
    </p>
    <?php
}

// Press Quote meta box
function ohb_press_quote_meta($post) {
    wp_nonce_field('ohb_press_quote_meta', 'ohb_press_quote_nonce');
    $source = get_post_meta($post->ID, '_quote_source', true);
    ?>
    <p>
        <label>Source (e.g., VARIETY, THE HOLLYWOOD REPORTER):</label><br>
        <input type="text" name="quote_source" value="<?php echo esc_attr($source); ?>" style="width:100%;">
    </p>
    <?php
}

// Cast/Crew meta box
function ohb_cast_crew_meta($post) {
    wp_nonce_field('ohb_cast_crew_meta', 'ohb_cast_crew_nonce');
    $role = get_post_meta($post->ID, '_member_role', true);
    ?>
    <p>
        <label>Role (e.g., Balthazar, Director):</label><br>
        <input type="text" name="member_role" value="<?php echo esc_attr($role); ?>" style="width:100%;">
    </p>
    <p>
        <em>Use the main content editor above for the bio (will show on hover).</em>
    </p>
    <?php
}

// Save meta data
function ohb_save_meta($post_id) {
    // Q&A Events
    if (isset($_POST['ohb_qa_event_nonce']) && wp_verify_nonce($_POST['ohb_qa_event_nonce'], 'ohb_qa_event_meta')) {
        if (isset($_POST['event_date'])) update_post_meta($post_id, '_event_date', sanitize_text_field($_POST['event_date']));
        if (isset($_POST['event_location'])) update_post_meta($post_id, '_event_location', sanitize_text_field($_POST['event_location']));
        if (isset($_POST['event_time'])) update_post_meta($post_id, '_event_time', sanitize_text_field($_POST['event_time']));
    }
    
    // Press Quotes
    if (isset($_POST['ohb_press_quote_nonce']) && wp_verify_nonce($_POST['ohb_press_quote_nonce'], 'ohb_press_quote_meta')) {
        if (isset($_POST['quote_source'])) update_post_meta($post_id, '_quote_source', sanitize_text_field($_POST['quote_source']));
    }
    
    // Cast/Crew
    if (isset($_POST['ohb_cast_crew_nonce']) && wp_verify_nonce($_POST['ohb_cast_crew_nonce'], 'ohb_cast_crew_meta')) {
        if (isset($_POST['member_role'])) update_post_meta($post_id, '_member_role', sanitize_text_field($_POST['member_role']));
    }
}
add_action('save_post', 'ohb_save_meta');

// Customizer settings
function ohb_customize_register($wp_customize) {
    // Hero Section
    $wp_customize->add_section('ohb_hero', array(
        'title' => 'Hero Section',
        'priority' => 30,
    ));
    
    $wp_customize->add_setting('hero_image', array('default' => ''));
    $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, 'hero_image', array(
        'label' => 'Hero Background Image',
        'section' => 'ohb_hero',
    )));
    
    // Trailer Section
    $wp_customize->add_section('ohb_trailer', array(
        'title' => 'Trailer',
        'priority' => 31,
    ));
    
    $wp_customize->add_setting('trailer_url', array('default' => ''));
    $wp_customize->add_control('trailer_url', array(
        'label' => 'YouTube Trailer URL',
        'section' => 'ohb_trailer',
        'type' => 'url',
    ));
    
    $wp_customize->add_setting('synopsis', array('default' => ''));
    $wp_customize->add_control('synopsis', array(
        'label' => 'Film Synopsis',
        'section' => 'ohb_trailer',
        'type' => 'textarea',
    ));
}
add_action('customize_register', 'ohb_customize_register');
