# Some global functions
#-------------------------------------------------------------
# By defaultly, all function will return 0 for yes, others for error.
#

# output separator without datetime
#-------------------------------------------------------------
function psep() {
    printf '%.1s' '-'{0..50}; echo
}


# output separator with datetime
#-------------------------------------------------------------
function pdate() {
    echo 
    printf '%.1s' '-'{0..50}
    echo "---[`date +'%Y%m%d-%H:%M:%S'`]---"
}

# Interact with message
#   $1: message
#-------------------------------------------------------------
function pask() {
    local lflag
    while :; do
        read -p "$1 ... [y/n]? " lflag
        if [ 'y' = "$lflag" ]; then
            return 0
        elif [ 'n' = "$lflag" ]; then
            echo 'Skip.'
            return 1
        else
            echo 'Please enter "y" to continue or "n" to skip.'
        fi
    done
}

# get that value of variabble
# $1: some message 
#-------------------------------------------------------------
function getvariable()
{
   while :; do
       echo "                              "
       read -p "    $1   " variable
       echo "                              "
       if [ X$variable != X ]
       then
           return 0
       else
           echo "That variable can't be null"
       fi
   done
}
# output error message with red color
#   $1: message
#-------------------------------------------------------------
function errmsg() {
    echo
    echo -e "\e[91m$1\e[0m"
    echo
}

# Validate system version
#   $1: os name
#-------------------------------------------------------------
function validate_os() {
    case "$1" in
        CentOS-6.x)
            pattern='.*CentOS.* 6.[0-9]\+ .*'
            ;;
        *)
            return 1
            ;;
    esac
    grep -ie "$pattern" /etc/system-release >/dev/null 2>&1
}

# Create app user
#   $1: user name
#   $2: user id
# return
#   0 for create success
#   1 for already exists 
#   2 for create program group failed
#   3 for create user failed
#-------------------------------------------------------------
function create_user() {
    id $1 >/dev/null 2>&1 && return 1
    grep program /etc/group >/dev/null 2>&1 || groupadd -g 1001 program || return 2
    useradd -g program -m -u $USERID $UNAME || return 3
}

# Create app user directory skeleton
#   $1: user name
#-------------------------------------------------------------
function create_app_skeleton() {
    chown -R $1:program /home/$1 
    chmod 770 /home/$1
    [ -d /home/$1/conf ] && sudo -u $1 rm -fr /home/$1/conf
    sudo -u $1 mkdir -p /home/$1/{bin,conf,data/cache,log,src,tmp,www}
    sudo -u $1 chmod -R g+rw,o-rwx /home/$1/{data,log}
}

# install crontab if exists
#   $1: user name
#   $2: action: { install | update | uninstall | restore }
#-------------------------------------------------------------
function do_crontab() {
    local _user=$1
    local _crontab="/home/$_user/conf/crontab.conf"
    [ -f $_crontab ] || return 0
    if [ "$2" = 'install' -o "$2" = 'update' -o "$2" = 'restore' ]; then
        sudo crontab -u $_user $_crontab
    elif [ "$2" = 'uninstall' ]; then
        sudo crontab -u $_user -r
    else
        return 1
    fi
}

# install logrotate if exists
#   $1: user name
#   $2: action: { install | update | uninstall | restore }
#-------------------------------------------------------------
function do_logrotate() {
    local _user=$1
    local _logrotate="$_home/conf/logrotate.conf"
    [ -f $_logrotate ] || return 0
    if [ "$2" = 'install' -o "$2" = 'update' -o "$2" = 'restore' ]; then
        sudo ln -sf $_logrotate /etc/logrotate.d/$_user
    elif [ "$2" = 'uninstall' ]; then
        sudo rm -f /etc/logrotate.d/$_user
    else
        return 1
    fi
}

# install httpd
#   $1: user name
#   $2: action: { install | update | uninstall | restore }
#   $3: environemt: { developing | staging | product ....}
#------------------------------------------------------------
function do_httpd() {
    local _httpd_local="/home/$1/conf/httpd.$1.conf"
    local _httpd_conf="/etc/httpd/conf.d/httpd.$1.conf"
    if [ -f /home/$1/conf/httpd.conf ];then
        sudo -u $1 mv /home/$1/conf/httpd.conf /home/$1/conf/httpd.$1.conf
    fi
     
    case "$2" in
        install)
            if [ -f $_httpd_local ]; then
                sudo ln -sf $_httpd_local $_httpd_conf || return 1
                sudo service httpd configtest 2>&1 | grep  -w warn && return 1
                sudo service httpd configtest || return 1
                sudo service httpd graceful
            fi
            ;;
        update)
            if [ -f $_httpd_local ]; then
                sudo ln -sf $_httpd_local $_httpd_conf || return 1
                sudo service httpd configtest 2>&1 | grep  -w warn && return 1
                sudo service httpd configtest && sudo service httpd graceful
            fi
            ;;
        restore )
            if [ -f $_httpd_conf ]; then
                sudo service httpd configtest && sudo service httpd graceful
            fi 
            ;;
        uninstall)
            if [ -f $_httpd_conf ]; then
                [ $(readlink -e $_httpd_conf | grep -wc "config/$3" ) -ne 0 ] || return 1
                sudo rm -f $_httpd_conf
                sudo service httpd configtest || return 1
                sudo service httpd graceful
            fi
            ;;
        *)
            return 1
            ;;
    esac
}


#
# install nginx & php-fpm
#  $1:user
function install_nginx_php()
{
    rpm -qa | grep  epel-release || sudo yum install -y epel-release >/dev/null
    which nginx || sudo yum install -y nginx >/dev/null   
    which nginx || return 1
    which php-fpm || sudo yum install -y php-fpm >/dev/null
    which php-fpm || return 1
    which php || yum -y install php php-cli php-mcrypt php-mbstring php-mysql php-pdo php-xml php-pear php-pecl-memcache php-pecl-apc php-bcmath php-gd
    which php-fpm || return 1
    which wget || yum install -y wget
    [ -f /etc/yum.repos.d/qiwo.repo ] || wget -c yum.qiwocloud1.com/qiwo.repo -O /etc/yum.repos.d/qiwo.repo
    php -m | grep phalcon || yum -y install phalcon
    php -m | grep phalcon || return 1
    chkconfig --add php-fpm  && chkconfig php-fpm on
    chkconfig --add nginx && chkconfig nginx on
    grep "51200" /etc/nginx/nginx.conf || sed -i 's#worker_connections  1024;#worker_connections  51200;#' /etc/nginx/nginx.conf
    grep -i ^expose_php.*Off /etc/php.ini || sed -i "s/^expose_php.*/expose_php = Off/" /etc/php.ini
    [ $(grep -wc '$server_name' /etc/nginx/nginx.conf) -eq 0 ] &&  sed -i 's/$remote_user/$remote_user $server_name/' /etc/nginx/nginx.conf
    [ $(grep -wc '$request_time' /etc/nginx/nginx.conf) -eq 0 ] && sed -i 's/$time_local/$time_local $request_time /' /etc/nginx/nginx.conf
    sudo cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
    grep "server_tokens" /etc/nginx/conf.d/default.conf || echo "server_tokens off;">/etc/nginx/conf.d/default.conf
    sudo usermod -G1001 nginx
    sudo usermod -G1001 apache
    pgrep -f httpd && unlink /etc/httpd/conf.d/httpd.$1.conf >/dev/null 2>&1
    [ -f /home/$1/conf/httpd.$1.conf ] && rm -fr /home/$1/conf/httpd.$1.conf
    sudo service httpd configtest && sudo service httpd graceful   
    [ ! -f /etc/php-fpm.d/www.conf.bak ] ||  sudo mv /etc/php-fpm.d/www.conf.bak /etc/php-fpm.d/www.conf
    sudo sed -i "s/pm.max_children.*/pm.max_children = 256/" /etc/php-fpm.d/www.conf
    find /etc/php-fpm.d/ -type l -name '*.conf' -exec unlink {} \;
    [  -f /etc/rsyslog.d/nginx_rsyslog.conf ]   || sudo cp /home/$1/conf/nginx_rsyslog.conf /etc/rsyslog.d/nginx_rsyslog.conf
    [  -f /etc/rsyslog.d/nginx_rsyslog.conf ] && sudo find /etc/rsyslog.d -type f -cmin -1 -exec  service rsyslog restart  \;

}

# install nginx
#   $1: user name
#   $2: action: { install | update | uninstall | restore }
#   $3: environemt: { developing | staging | product ....}
#------------------------------------------------------------
function do_nginx() {
    local _nginx_local="/home/$1/conf/nginx.$1.conf"
    local _nginx_conf="/etc/nginx/conf.d/nginx.$1.conf"
    [ ! -f /home/$1/conf/nginx.conf ] && return 0
    [ -f /home/$1/conf/nginx.conf ]  &&  sudo -u $1 mv /home/$1/conf/nginx.conf $_nginx_local
    install_nginx_php $1  || return 1
    case "$2" in
        install | update )
            if [ -f $_nginx_local ]; then
                [ -f $_php_fpm_local ]  || return 1
                sudo ln -fsn $_nginx_local $_nginx_conf
                sudo nginx -t || return 1
                pgrep -f 'nginx: master process' || sudo service nginx restart
                pgrep -f "php-fpm: master process" || sudo service php-fpm restart
                sudo service php-fpm reload || return 1
                sudo service nginx reload || return 1
            fi
            ;;
        restore )
            if [ -f $_nginx_conf ]; then
                sudo nginx -t &&  sudo service nginx reload
            fi
            ;;
        uninstall)
            if [ -f $_nginx_conf ]; then
                unlink $_nginx_conf
                sudo service php-fpm reload || return 1
                sudo service nginx reload || return 1
            fi
            ;;
        *)
            return 1
            ;;
    esac
}




# install pm2
#-------------------------------------------------------------
function install_pm2() {
    node --version >/dev/null 2>&1 || sudo yum install -y nodejs npm || return 1
    pm2 --version >/dev/null 2>&1 || sudo npm install pm2@latest -g || return 1
}

# build pm2 per-user auto-start service script 
#   $1: user name
#   $2: source code path
#-------------------------------------------------------------
function build_pm2app_service() {
    local _user=$1
    local _pm2srv="pm2-$_user"
    local _pm2init="$2/config/$_pm2srv"

    sudo -u $_user cp -f /usr/lib/node_modules/pm2/lib/scripts/pm2-init-centos.sh $_pm2init
    chmod 777 $_pm2init

    local _pm2_path="$(readlink -e `which pm2`)"
    local _node_path="$(dirname `which node`)"

    sudo -u $_user sed -i -e "s/^[ \t]*NAME=.*/NAME=$_pm2srv/g"                         $_pm2init
    sudo -u $_user sed -i -e 's|%PM2_PATH%|'"$_pm2_path"'|g'                            $_pm2init
    sudo -u $_user sed -i -e "s/%USER%/$_user/g"                                        $_pm2init
    sudo -u $_user sed -i -e 's|%NODE_PATH%|'"$_node_path"'|g'                          $_pm2init
    sudo -u $_user sed -i -e "s/%HOME_PATH%/\/home\/$_user\/.pm2/g"                     $_pm2init
    sudo -u $_user sed -i -e "s/^[ \t]*\(lockfile=.*\)\/pm2-init\.sh.*/\1\/$_pm2srv\"/" $_pm2init
}

# install pm2 app service
#   $1: user name
#   $2: action: { install | update | uninstall | restore }
#   $3: environemt: { developing | staging | product ....}
#-------------------------------------------------------------
function do_pm2app_service() {
    local _pm2srv="pm2-$1"
    case "$2" in
        install)
            local _pm2init="/home/$1/conf/$_pm2srv"
            if [ -f $_pm2init ]; then
                sudo ln -sf $_pm2init /etc/init.d/ && sudo chkconfig $_pm2srv on
            fi
            ;;
        update)
            if [ -f /etc/init.d/$_pm2srv ]; then
                sudo service $_pm2srv restart
            fi
            ;;
        restore)
            if [ -f /etc/init.d/$_pm2srv ]; then
                sudo service $_pm2srv restart
            fi
            ;;
        uninstall)
            if [ -f /etc/init.d/$_pm2srv  ];then
                [ $(readlink -e /etc/init.d/$_pm2srv |grep -wc "config/$3") -ne 0 ] || return 1
                sudo chkconfig --del $_pm2srv
                sudo rm -f /etc/init.d/$_pm2srv
            fi
            ;;
        *)
            return 1
            ;;
    esac
}

# Start pm2 app
#   $1: user name
#-------------------------------------------------------------
function start_pm2app() {
    local _pm2app="/home/$1/conf/pm2-app.json"
    su - $1 -c "pm2 startOrGracefulReload $_pm2app" || return 1
    su - $1 -c "pm2 save" # for resurrecting
}

# Stop pm2 app
#   $1: user name
#-------------------------------------------------------------
function stop_pm2app() {
    su - $1 -c "pm2 kill"
}

# install pm2 app
#   $1: user name
#   $2: action: { install | update | uninstall | restore }
#-------------------------------------------------------------
function do_pm2app() {
    local _user=$1
    local _pm2app="/home/$_user/conf/pm2-app.json"
    [ -f $_pm2app ] || return 0
    case "$2" in
        install)
                install_pm2 || return 1
                do_pm2app_service $_user install || return 1
                start_pm2app $_user || return 1
            ;;
        update)
            do_pm2app_service $_user update
            ;;
        restore)
            do_pm2app_service $_user restore
            ;; 
        uninstall)
            stop_pm2app $_user
            do_pm2app_service $_user uninstall
            ;;
        *)
            return 1
            ;;
     esac
}

# mysql_dir
#  $1: username
#  $2: dir
#-------------------------------------------------------------
function mysql_dir()
{
   if [ ! -d $2 ]
   then
       sudo -u $1 mkdir -p $2
   fi
}

# mysql check port
# $1: my.cnf configuration location
#-------------------------------------------------------------
function mysql_check_port()
{
   port=$(cat $1 | grep -v '#' | grep -w port |cut -d'=' -f2 )
   if [ $(netstat -atunpl |awk -F' ' '{print $4}' |grep [0-9] |awk -F':' '{print $NF}' | grep -c ${port}) -ne 0 ]    
   then
        errmsg "That port ${port} in using"
        exit 1
   fi
}

#  install mysqld & start mysqld
#  $1: username
#-------------------------------------------------------------
function install_start_mysqld()
{
    sudo -u  $1 mysql_install_db --user=$1 --datadir=/home/$1/data/mysql || return 1
    sudo ln -fsn /home/$1/conf/mysqld/mysqld /etc/init.d/$1_mysqld
    chmod 777 /etc/init.d/$1_mysqld
    chkconfig --add $1_mysqld
    chkconfig $1_mysqld on
    /etc/init.d/$1_mysqld start || return 1
    mysql -uroot -S /home/$1/data/mysql/mysql.sock < /home/$1/conf/mysqld/install.sql || return 1
}



#  install_mysqld
#  $1: username
#-------------------------------------------------------------
function install_mysqld()
{
   sudo yum install -y mysql-server >/dev/null 2>&1 || return 1
   sudo yum install -y mysql  >/dev/null 2>&1 || return 1
   mysql_dir $1 /home/$1/data/mysql
   mysql_dir $1 /home/$1/log/mysql
   mysql_check_port /home/$1/conf/mysqld/my.cnf
   MASTER_SLAVE=$(cat /home/$1/conf/mysqld/master_slave.conf | grep -v ^'#' | grep -w MASTER_SLAVE |cut -d '=' -f2 |tr -d ' ' )
   case $MASTER_SLAVE in
       Yes )
            master=$(cat /home/$1/conf/mysqld/master_slave.conf | grep -v '#' | grep -w master | cut -d '=' -f2 | tr -d ' ' )
            slave=$(cat /home/$1/conf/mysqld/master_slave.conf | grep -v '#' | grep -w slave | cut -d '=' -f2 | tr -d ' ')
            [ X$slave  == X$master  ] &&  exit  1
            if [ $(ip add |grep -wc ${master}) -ne 0 ]
            then
                sudo -u $1 sed -i -e "s/%ID%/11/g" /home/$1/conf/mysqld/my.cnf
                sudo -u $1 echo "#MASTER" >> /home/$1/conf/mysqld/my.cnf        
                install_start_mysqld $1        
                mysql -uroot -S /home/$1/data/mysql/mysql.sock < /home/$1/conf/mysqld/master.sql || return 1
                if [ -f /home/$1/bin/update.sh ]
                then
                    exec_time=$(cat /home/$1/bin/update.sh |grep -w exec_time |grep -v '#' |cut -d'=' -f2 |tr -d '"' |tr -d ' ')
                    update_time=$((exec_time+1))
                    run_time=$(date +%Y%m%d%H)
                    if [ ${update_time} -ge ${run_time} ]
                    then
                        if [ ${exec_time} -le ${run_time} ]
                        then
                           sudo -u $1 sh /home/$1/bin/update.sh || return 1
                        fi
                    fi
                fi               
            else
                if [ $(ip add |grep -wc ${slave}) -ne 0 ]
                then
                    sudo -u $1 sed -i -e "s/%ID%/21/g" /home/$1/conf/mysqld/my.cnf
                    sudo -u $1 echo "#SLAVE" >> /home/$1/conf/mysqld/my.cnf        
                    install_start_mysqld $1
                    slave_password=$(cat /home/$1/conf/mysqld/master.sql | grep -v ^'#' |grep -w "slave_install" |awk -F' ' '{print $NF}' |tr -d "'" |tr -d ';' )
                    if [ X${slave_password} == X ] 
                    then
                        errmsg "That password of slave_install can't be null in /home/$1/conf/sql/master.sql"
                        exit 1
                    fi
                    sleep 30
                    mysql -h${master} -P${port} -u'slave_install' -p${slave_password} -e "show master status;" 2>/dev/null || return 1
                    BINLOG=$(mysql -h${master} -P${port} -u'slave_install' -p${slave_password} -e "show master status;"  | sed -n '2,$p' |awk -F' ' '{print $1}' )
                    MASTER_LOG_POS=$(mysql -h${master} -P${port} -u'slave_install' -p${slave_password} -e "show master status;"  | sed -n '2,$p' |awk -F' ' '{print $2}' )
                    sudo -u $1 sed -i -e "s/%BINLOG%/$BINLOG/g" /home/$1/conf/mysqld/slave.sql
                    sudo -u $1 sed -i -e "s/%POSITION%/$MASTER_LOG_POS/g" /home/$1/conf/mysqld/slave.sql
                    mysql -uroot -S /home/$1/data/mysql/mysql.sock < /home/$1/conf/mysqld/slave.sql  || return 1          
                else
                    errmsg "That machine's ip address must be master or slave"
                    exit 1
                fi
            fi
       ;;
       *  )
           sudo -u $1 sed -i -e "s/%ID%/31/g" /home/$1/conf/mysqld/my.cnf
           sudo -u $1 echo "#STAND" >> /home/$1/conf/mysqld/my.cnf
           install_start_mysqld $1
       ;;
   esac
}



# do mysqld
#   $1: user name 
#   $2: action: { install | update | uninstall }
#   $3: environemt: { developing | staging | product .....}
#-------------------------------------------------------------
function do_mysqld()
{
    local _mysqld_conf="/home/$1/conf/mysqld/my.cnf" 
    [ -f $_mysqld_conf ]  || return 0
    case "$2" in 
        install )
                 install_mysqld  $1 || return 1
            ;;
        update )       
                MASTER_SLAVE=$(cat /home/$1/conf/mysqld/master_slave.conf | grep -v '#' | grep -w MASTER_SLAVE |cut -d '=' -f2 |tr -d ' ' )
                if [ X$MASTER_SLAVE == XYes ]
                then
                    master=$(cat /home/$1/conf/mysqld/master_slave.conf | grep -v '#' | grep -w master | cut -d '=' -f2 | tr -d ' ' )
                    slave=$(cat /home/$1/conf/mysqld/master_slave.conf | grep -v '#' | grep -w slave | cut -d '=' -f2 | tr -d ' ')
                    if [ $(ip add |grep -wc ${master}) -ne 0 ]
                    then     
                        sudo -u $1  sed -i -e "s/%ID%/11/g" /home/$1/conf/mysqld/my.cnf
                        if [ $(cat /home/$1/conf/mysqld/my.cnf |grep -wc "#MASTER") -eq 0 ]
                        then
                            sudo -u $1 echo "#MASTER" >> /home/$1/conf/mysqld/my.cnf  || return 1
                        fi
                        if [ -f /home/$1/bin/update.sh ]
                        then
                            exec_time=$(cat /home/$1/bin/update.sh |grep -w exec_time |grep -v '#' |cut -d'=' -f2 |tr -d '"' |tr -d ' ')
                            update_time=$((exec_time+1))
                            run_time=$(date +%Y%m%d%H)
                            if [ ${update_time} -ge ${run_time} ]
                            then
                                if [ ${exec_time} -le ${run_time} ]
                                then
                                    sudo -u $1 sh /home/$1/bin/update.sh
                                fi
                            fi
                        fi  
                    else
                        if [ $(ip add |grep -wc ${slave}) -ne 0 ]
                        then
                            sudo -u $1 sed -i -e "s/%ID%/21/g" /home/$1/conf/mysqld/my.cnf
                            if [ $(cat /home/$1/conf/mysqld/my.cnf |grep -wc "#SLAVE") -eq 0 ]
                            then
                                sudo -u $1 echo "#SLAVE" >> /home/$1/conf/mysqld/my.cnf   
                            fi
                        fi
                    fi 
                else
                    sudo -u $1 sed -i -e "s/%ID%/31/g" /home/$1/conf/mysqld/my.cnf
                    if [ $(cat /home/$1/conf/mysqld/my.cnf |grep -wc "#STAND") -eq 0 ]
                    then
                        sudo -u $1 echo "#STAND" >> /home/$1/conf/mysqld/my.cnf   
                    fi
                fi
                [ -f /etc/init.d/$1_mysqld ] && chmod 777 /etc/init.d/$1_mysqld
        ;;
        uninstall )
                if [ -f /etc/init.d/$1_mysqld  ]; then
                    [ $(readlink -e /etc/init.d/$1_mysqld |grep -wc "config/$3") -ne 0 ] || return 1
                    /etc/init.d/$1_mysqld stop  && rm -fr  /etc/init.d/$1_mysqld  || return 1
                    [ -d /home/$1/log/mysql ] && rm -fr /home/$1/log/mysql || return 1
                fi
        ;;
        restore)
                return 0
        ;;    
        *      )
                return 1  
            ;;
    esac  
    
}

# install app
#   $1: user name
#   $2: source code path
#   $3: optional, action: { install | update | restore}
#-------------------------------------------------------------
function install_app() {
    [ -d "/home/$1" ] || return 1
    [ -d "$2" ] || return 1
   
    local _action='install'
    if [ $# -gt 2 ]; then
        case "$3" in
            install)
                local _action='install'
                ;;
            update)
                local _action='update'
                ;;
            restore)
                local _action='restore'
                ;;
            *)
                return 1
                ;;
        esac
    fi

    local _user=$1
    local _src=$2
    local _env=$4
    local _home="/home/$_user"
    local _srcut="$_home/src/CURRENT"
    
    ##### cd /tmp is very important for Using find ##
    cd /tmp
    # make links
    sudo -u $_user ln -snf  $_src           $_srcut
    sudo -u $_user find $_srcut/config/$_env  -mindepth 1 -maxdepth 1  -exec ln -fsn {} $_home/conf/ \;
    sudo -u $_user find $_srcut/config -mindepth 1 -maxdepth 1 -type f -exec ln -fsn {} $_home/conf/ \;
    sudo -u $_user find $_srcut/etc -mindepth 1 -maxdepth 1 -type f -exec ln -fsn {} $_home/conf/ \;
    sudo -u $_user ln -snf  $_srcut/web     $_home/www/htdocs
    sudo -u $_user chown -R $_user:program  $_home/conf
    sudo -u $_user find $_srcut/scripts -mindepth 1 -maxdepth 1 -type f -exec ln -fsn {} $_home/bin \;
    sudo chown -R $_user:program  $_home/www/htdocs/
    sudo chown -R $_user:program  $_home/src
    do_crontab      $_user $_action || return 2
    do_logrotate    $_user $_action || return 3
    do_httpd        $_user $_action || return 4
    do_pm2app       $_user $_action || return 5
    do_mysqld       $_user $_action || return 6
    do_nginx        $_user $_action || return 7
    sudo -u $_user find $_src -type d -exec chmod 750 {} \;
    sudo -u $_user find $_src -type f -exec chmod 640 {} \;
    if [ -f $_home/bin/customer.sh ]; then
       sudo -u $_user sh $_home/bin/customer.sh  || return 1
    fi    


}

# uninstall app
#   $1: user name
#   $2: environment
#-------------------------------------------------------------
function uninstall_app() {
     if [
         ! -z "$1" ]; then
        do_crontab      $1 uninstall 
        do_logrotate    $1 uninstall $2|| return 3
        do_httpd        $1 uninstall $2 || return 4
        do_pm2app       $1 uninstall $2 || return 5
        do_mysqld       $1 uninstall $2 || return 6
        do_nginx        $1 uninstall $2 || return 7
    fi
}

# get user name from ReadMe
#   $1: ReadMe file path
# return
#   errno will allways be 0
#   user name will be return, or empty
#-------------------------------------------------------------
function get_username() {
    grep -i project "$1" 2>/dev/null | awk -F '[ |\t|=]+' '{ print $2; }' 2>/dev/null
}

# get user id from ReadMe
#   $1: ReadMe file path
# return
#   errno will allways be 0
#   user id will be return, or empty
#-------------------------------------------------------------
function get_userid() {
    grep -i user_id "$1" 2>/dev/null | awk -F '[ |\t|=]+' '{ print $2; }' 2>/dev/null
}

# get app type from ReadMe
#   $1: ReadMe file path
# return
#   errno will allways be 0
#   app type will be return, or empty
#-------------------------------------------------------------
function get_apptype() {
    grep -i type "$1" 2>/dev/null | awk -F '[ |\t|=]+' '{ print $2; }' 2>/dev/null
}

#   $1: user name
#-------------------------------------------------------------
function is_httpd_app() {
    [ -e /home/$1/conf/httpd.conf ] # && return 0 || return 1
}

#   $1: user name
#-------------------------------------------------------------
function stat_httpd_app() {
    echo 'httpd configuration:'; psep
    ls -l /etc/httpd/conf.d/httpd-$1.conf
    echo
    echo 'httpd syntax check and virtual host list:'; psep
    apachectl -S
}

#   $1: user name
#-------------------------------------------------------------
function is_pm2_app() {
    [ -e /home/$1/conf/pm2-app.json ] # && return 0 || return 1
}

#   $1: user name
#-------------------------------------------------------------
function stat_pm2_app() {
    echo 'pm2 app declaration:'; psep
    ls -l /home/$1/conf/pm2-app.json
    echo
    echo 'pm2 app per-user service:'; psep
    ls -l /etc/init.d/pm2-$1
    echo
    echo 'pm2 app per-user service runlevel info:'; psep
    chkconfig pm2-$1 --list
    echo
    echo 'pm2 app processes:'; psep
    service pm2-$1 status
}

#{+----------------------------------------- Embira Footer 1.7 -------+
# | vim<600:set et sw=4 ts=4 sts=4:                                   |
# | vim600:set et sw=4 ts=4 sts=4 ff=unix cindent fdm=indent fdn=1:   |
# +-------------------------------------------------------------------+}
