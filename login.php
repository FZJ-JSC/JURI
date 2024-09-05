<?php
/* 
* Copyright (c) 2023 Forschungszentrum Juelich GmbH.
* This file is part of JURI. 
*
* This is an open source software distributed under the GPLv3 license. More information see the LICENSE file at the top level.
*
* Contributions must follow the Contributor License Agreement. More information see the CONTRIBUTING.md file at the top level.
*
* Contributors:
*    Wolfgang Frings (Forschungszentrum Juelich GmbH) 
*    Sebastian Lührs (Forschungszentrum Juelich GmbH) 
*    Filipe Guimarães (Forschungszentrum Juelich GmbH)   
*/
function debug_to_console($data) {
  $output = $data;
  if (is_array($output))
    $output = implode(',', $output);

  echo "<script>console.log('PhP debug: " . $output . "' );</script>";
}

$dir=dirname($_SERVER['SCRIPT_FILENAME']);
if (!isset($_SERVER['PHP_AUTH_USER'])) {
  header('WWW-Authenticate: Basic realm="Job Monitor"');
  header('HTTP/1.0 401 Unauthorized');
  echo 'You are not logged in. Please, reload the page and try again.';
  exit;
}

// Get info from mapping
if (isset($_SERVER['REMOTE_USER'])) {
  $user = strtolower($_SERVER['REMOTE_USER']);
} else {
  $user = strtolower($_SERVER['PHP_AUTH_USER']);
}
$demo = false;
if (strpos($dir, 'demo') !== false) {
  $demo = " DEMO";
  $inifile = parse_ini_file($dir.'/sec_files/mapping.txt', TRUE);
} else {
  $inifile = parse_ini_file($dir.'/data/sec_files/mapping.txt', TRUE);
}
$remarks = "";
// $remarks = "<P>Current web service login: <b>". $user ."</b>";

$systemname=$inifile["config"]["system"];

// Find jobID in mapping and forward to HTML report
if(isset($_GET["jobid"])) {
  $jobid=$_GET["jobid"];
  // Gettting zipped contents and unzipping it
  $zipped = file_get_contents($dir.'/data/sec_files/jobids.txt.gz');
  $unzipped = gzdecode($zipped);
  // Parsing data
  $jobfile = parse_ini_string($unzipped, TRUE);
  // Separating project from user
  $info = explode(",",$jobfile['jobid_map'][$jobid]);
  // Getting project and user
  $project = $info[0];
  $user = $info[1];
  if (!$project) {
    // If no project is found, forward to error page
    header('Location: error404.html');
  } else {
    // Building correct link
    $newURL = "data/projects/".$project."/".$user."/jobreport_".$systemname."_".$project."_".$user."_".$jobid.".html";
    header('Location: '.$newURL);
  }
  exit();
}

// Forward to project page
if(isset($_GET["project"])) {
  // Getting project and user
  $project=$_GET["project"];
  // Building correct link
  $newURL = "index.html?config=/data/ll/project&project=".$project;
  header('Location: '.$newURL);
  exit();
}

// Folder name
$folder=$systemname;
if (strcmp($systemname, 'jureca') == 0) {
  $systemname .= "-dc";
}
// Image filename
if (isset($inifile["config"]["image"]) && !empty($inifile["config"]["image"])) {
  $image=$inifile["config"]["image"];
} else {
  $image="img/".strtolower($systemname).".jpg";
}
// Adding suffix '_demo' to folder in case it is demo mode
if ($demo) {
  $folder .= "_demo";
}  

// $remarks .= "<br>system name: <b>". $systemname ."</b><br>";

$inputfield="";
$script="";
if(isset($inifile["supporter"][$user])) {
  $inputfield="<input type='text' placeholder='Login as username' id='loginasuser' /><input type='button' id='loginasuserbutton' class='submit'/>";
  $inputfield.="<input type='text' placeholder='Jump to project' id='project' /><input type='button' id='projectbutton' class='submit'/>";
  $script="
<script>
  const loginasuser = document.getElementById('loginasuser');
  function loginAsUser() {
    if (loginasuser.value) {
      window.location.replace(`login.php?loginasuser=\${loginasuser.value}`);
    }
  }
  // Adding listener when pressing the enter key
  loginasuser.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      loginAsUser();
    }
  });
  // Adding listener when pressing the button
  const loginasuserbutton = document.getElementById('loginasuserbutton');
  loginasuserbutton.addEventListener('click',loginAsUser);

  const project = document.getElementById('project');
  function jumpToProject() {
    if (project.value) {
      window.location.replace(`login.php?project=\${project.value}`);
    }
  }
  // Adding listener when pressing the enter key
  project.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      jumpToProject();
    }
  });
  // Adding listener when pressing the button
  const projectbutton = document.getElementById('projectbutton');
  projectbutton.addEventListener('click',jumpToProject);
</script>
";
  if(isset($_GET["loginasuser"]) && $_GET["loginasuser"]!=$user) {
    // Checking if user exists in any of the roles
    if(!isset($inifile["active_user"][$_GET["loginasuser"]]) && !isset($inifile["nonactive_user"][$_GET["loginasuser"]]) && 
      !isset($inifile["active_pi"][$_GET["loginasuser"]]) && !isset($inifile["nonactive_pi"][$_GET["loginasuser"]]) &&
      !isset($inifile["active_copi"][$_GET["loginasuser"]]) && !isset($inifile["nonactive_copi"][$_GET["loginasuser"]]) &&
      !isset($inifile["active_pa"][$_GET["loginasuser"]]) && !isset($inifile["nonactive_pa"][$_GET["loginasuser"]]) &&
      !isset($inifile["mentor"][$_GET["loginasuser"]]) && !isset($inifile["supporter"][$_GET["loginasuser"]])) {
      // If not, emit alert and redirect to regular login.php
      $alert = "User \"".$_GET["loginasuser"]."\" not found on ".strtoupper($systemname)."!";
      echo "<script type='text/javascript'>alert('$alert'); window.location.replace('login.php'); </script>";
      exit();
    }
    $loginasuser=$_GET["loginasuser"];
    if(isset($loginasuser)) {
      // $remarks.= "<font color=\"red\"><b>Changed to user loginasuser: ". $_GET["loginasuser"]."</b></font><br>";
      $user=$loginasuser;
      $loginasuser="<font color=\"red\">$user</font>";
    }
  }
}
#else {
#    $remarks.= "<br>";
#    $remarks.= "<b>!!! Service is currently in maintanance !!!</b>";
#    $remarks.= "<br>";
#    echo $remarks;
#    exit(1);
#}
#print_r($inifile["active_user"]);
#echo $remarks;
#exit;

#$remarks= "<br>";
#$remarks.= "<font color=\"red\"><b>!!! System is in maintenance !!!</b></font>";
#$remarks.= "<br>";
#$remarks.= "<br>";

// if(isset($inifile["active_user"][$user])){
//   $field = $inifile["active_user"][$user];
// }

$userlinks = "";
$linktemplate = '<tr><td><a href="index.html?config=/data/ll/user&project=@@group@@&user=@@user@@">@@account@@</a></td><td> (data available)</td></tr>';
if(isset($inifile["active_user"][$user])){
  foreach($inifile["active_user"][$user] as $account => $group){
    $link = str_replace("@@user@@", $user, $linktemplate);
    $link = str_replace("@@account@@", $account, $link);
    $link = str_replace("@@group@@", $group, $link);	
    $link = str_replace("@@folder@@", $folder, $link);	
    $userlinks.=$link;
  }
}
$linktemplate = '<tr><td><a href="index.html?config=/data/ll/user&project=@@group@@&user=@@user@@">@@account@@</a></td><td> (no data)</td></tr>';
if(isset($inifile["nonactive_user"][$user])){
  foreach($inifile["nonactive_user"][$user] as $account => $group){
    $link = str_replace("@@user@@", $user, $linktemplate);
    $link = str_replace("@@account@@", $account, $link);
    $link = str_replace("@@group@@", $group, $link);	
    $link = str_replace("@@folder@@", $folder, $link);	
    $userlinks.=$link;
  }
}

$pilinks = "";
$linktemplate = '<tr><td><a href="index.html?config=/data/ll/project&project=@@group@@">@@group@@</a></td><td> (data available)</td></tr>';
if(isset($inifile["active_pi"][$user])){
  foreach($inifile["active_pi"][$user] as $account => $group){
    $link = str_replace("@@group@@", $group, $linktemplate);
    $link = str_replace("@@folder@@", $folder, $link);	
    $pilinks.=$link;
  }
}
$linktemplate = '<tr><td><a href="index.html?config=/data/ll/project&project=@@group@@">@@group@@</a></td><td> (no data)</td></tr>';
if(isset($inifile["nonactive_pi"][$user])){
  foreach($inifile["nonactive_pi"][$user] as $account => $group){
    $link = str_replace("@@group@@", $group, $linktemplate);
    $link = str_replace("@@folder@@", $folder, $link);	
    $pilinks.=$link;
  }
}


$copilinks = "";
$linktemplate = '<tr><td><a href="index.html?config=/data/ll/project&project=@@group@@">@@group@@</a></td><td> (data available)</td></tr>';
if(isset($inifile["active_copi"][$user])){
  foreach($inifile["active_copi"][$user] as $account => $group){
    $link = str_replace("@@group@@", $group, $linktemplate);
    $link = str_replace("@@folder@@", $folder, $link);	
    $copilinks.=$link;
  }
}
$linktemplate = '<tr><td><i>@@group@@</td><td> (no data)</i></td></tr>';
if(isset($inifile["nonactive_copi"][$user])){
  foreach($inifile["nonactive_copi"][$user] as $account => $group){
    $link = str_replace("@@group@@", $group, $linktemplate);
    $copilinks.=$link;
  }
}

$palinks = "";
$linktemplate = '<tr><td><a href="index.html?config=/data/ll/project&project=@@group@@">@@group@@</a></td><td> (data available)</td></tr>';
if(isset($inifile["active_pa"][$user])){
  foreach($inifile["active_pa"][$user] as $account => $group){
    $link = str_replace("@@group@@", $group, $linktemplate);
    $link = str_replace("@@folder@@", $folder, $link);	
    $palinks.=$link;
  }
}
$linktemplate = '<tr><td><a href="index.html?config=/data/ll/project&project=@@group@@">@@group@@</a></td><td> (no data)</td></tr>';
if(isset($inifile["nonactive_pa"][$user])){
  foreach($inifile["nonactive_pa"][$user] as $account => $group){
    $link = str_replace("@@group@@", $group, $linktemplate);
    $link = str_replace("@@folder@@", $folder, $link);	
    $palinks.=$link;
  }
}

$mentorlinks = "";
$linktemplate = '<td><a href="index.html?config=/data/ll/mentor&mentor=@@user@@">Mentor view</a></td>';
if(isset($inifile["mentor"][$user])){
  foreach($inifile["mentor"][$user] as $path){
    $link = str_replace("@@path@@", $path, $linktemplate);	
    $link = str_replace("@@folder@@", $folder, $link);	
    $link = str_replace("@@user@@", $user, $link);
    $mentorlinks.=$link;
  }
}

$supporterlinks = "";
$linktemplate = '<td><a href="index.html?config=/data/ll/support">Supporter view</a></td>';
if(isset($inifile["supporter"][$user])){
  foreach($inifile["supporter"][$user] as $path){
    $link = str_replace("@@path@@", $path, $linktemplate);	
    $link = str_replace("@@folder@@", $folder, $link);	
    $supporterlinks.=$link;
  }
}

// Building tables to use on login page
$table = "";
if( !empty($userlinks) ) {
  $table .= '<table>';
  $table .= "<thead><tr><th colspan='2'> User view per project </th></tr></thead>";
  $table .= "<tbody>".$userlinks."</tbody>";
  $table .= '</table>';
}
if( !empty($pilinks) ) {
  $table .= '<table>';
  $table .= "<thead><tr><th colspan='2'> Project view as Principal Investigator (PI) </th></tr></thead>";
  $table .= "<tbody>".$pilinks."</tbody>";
  $table .= '</table>';
}
if( !empty($copilinks) ) {
  $table .= '<table>';
  $table .= "<thead><tr><th colspan='2'> Project view as Co-Principal Investigator (Co-PI) </th></tr></thead>";
  $table .= "<tbody>".$copilinks."</tbody>";
  $table .= '</table>';
}
if( !empty($palinks) ) {
  $table .= '<table>';
  $table .= "<thead><tr><th colspan='2'> Project view as Project Administrator (PA) </th></tr></thead>";
  $table .= "<tbody>".$palinks."</tbody>";
  $table .= '</table>';
}
if( !empty($mentorlinks)||!empty($supporterlinks) ) {
  $table .= '<table id="other">';
  $table .= "<thead><tr><th colspan='2'> Other views </th></tr></thead>";
  $table .= "<tbody><tr>".$mentorlinks.$supporterlinks."</tr></tbody>";
  $table .= '</table>';
}

$systemname = str_replace("_", " ", $systemname);
$systemname = strtoupper($systemname);

// Defining systems at JSC
$systemmap = array(
  'SYSTEM' => 'JURECA DC',
  'JURECA-DC' => 'JURECA DC',
  'JUWELS BOOSTER' => 'JUWELS Booster',
  'JUWELS' => 'JUWELS Cluster',
  'JEDI' => 'JEDI',
  'DEEP' => 'DEEP',
  'JUSUF' => 'JUSUF HPC',
);
if (array_key_exists($systemname,$systemmap)) {
  // Defining profile page:
  $profile_page = 'https://judoor.fz-juelich.de/account/a/JSC_LDAP/'.$user.'/';
  $status_endpoint = 'https://status.jsc.fz-juelich.de/api/services/?format=json';
  // Getting health of this system from status page:
  if (isset($status_endpoint) && $status_endpoint !== '') {
    try {
      $json = file_get_contents($status_endpoint);
      $services = json_decode($json,true);
      if (gettype($services) == 'array') {
        foreach ($services as $service) {
          if ($systemmap[$systemname] == $service['name']) {
            $health = $service['health'];
            $status_page = 'https://status.jsc.fz-juelich.de/services/'.$service['id'];
          }
        }  
      }
    }
    catch(Throwable $ignored){
    }  
  }
}

#$systemname = str_replace("BOOSTER", "Booster", $systemname);
if(isset($loginasuser)) {
  $user=$loginasuser;
}

$parameters = array(
                    'username' => $user, 
                    'remarks' => $remarks,
                    'table' => $table,
                    'folder' => $folder,
                    'image' => $image,
                    'demo' => $demo,
                    'system' => $systemname,
                    'inputfield' => $inputfield,
                    'script' => $script,
                    'health' => $health,
                    'status_page' => $status_page,
                    'profile_page' => $profile_page
                    );
$template = file_get_contents($dir.'/config/template.html');

$result = $template;
foreach($parameters as $key => $value){
  $search = '@@'.$key.'@@';
  $result = str_replace($search, $value, $result);
}

echo $result;
