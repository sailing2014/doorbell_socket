#!/bin/sh
# Created at: 2015-04-03 08:38:00
#-------------------------------------------------------------

# Description
#-------------------------------------------------------------
# Install application
#-------------------------------------------------------------
#
# The deploy tool SHOULD create the app user in the destination server, and 
# deploy the application to ~${appuser}/src/${environment}/${deployversion} 
# before running this install.sh .
#
# This script will do the following mission:
#
#  1. Get user name from ReadMe
#  2. Make I/F links
#  3. Install crontab if exists
#  4. Install logrotate config if exists
#  5. Install httpd config if exists
#  6. Install pm2 app if exists
#

function usage() {
    echo -e "\nUsage:"
    echo -e "\t`basename $0` [action  env [-q]]\n"
    echo -e "Parameters:"
    echo -e "\taction:  { install | update | uninstall | restore }"
    echo -e "\tenv:  { developing | product | staging }"
    echo -e "\t-q:      quiet mode, no interation.\n"
}

# Validattion
#-------------------------------------------------------------
source "`dirname $0`/function.sh" || { echo; echo 'Error: required function.sh!'; echo; exit 1; }

# validate system version
if ! validate_os 'CentOS-6.x'; then
    echo -e '\nOnly for CentOS 6.x .'
    echo -e "But this system is `cat /etc/system-release || unknown`.\n"
    exit 1
fi


# validate user permission
[ "${UID}" -ne 0 ] && { errmsg 'Try sudo!'; exit 1; }

which dos2unix || yum install -y dos2unix >/dev/null
# get user name and user id from ReadMe
SRC="$(readlink -e `dirname $0`/..)"
dos2unix $SRC/ReadMe
README="$SRC/ReadMe"; [ -f "$README" ] || { errmsg "Error: [$README] does not exist!"; exit 1; }
UNAME="`get_username $README`"; [ -z "$UNAME" ] && { errmsg 'Error: get user name failed!'; exit 1; }
USERID="`get_userid $README`"; [ -z "$USERID" ] && { errmsg 'Error: get user id failed!'; exit 1; }
TYPE="`get_apptype $README`"; [ -z "$TYPE" ] && { errmsg 'Error: get app type failed!'; exit 1; }
ENV_TYPE=`find $SRC/config -mindepth 1 -maxdepth 1 -type d |awk -F'/' '{print $NF}' |xargs `

# validate user & id
RID="`id -u $UNAME 2>/dev/null`" || { errmsg "Error: the user '$UNAME' does not exist!"; exit 1; }
[ "$RID" = "$USERID" ] || { errmsg "Error: userid.real($RID) != userid.readme($USERID)"; exit 1; }

# validate source code path
echo $SRC | grep -e "^/home/$UNAME/src/" >/dev/null 2>&1 || {
    errmsg "Error: The source code [$SRC] MUST be placed in [/home/$UNAME/src/]"
    exit 1
}

# validate args
ACTION='install'    # by default
if [ $# -gt 0 ]; then
    if [ "$1" = 'install' -o "$1" = 'update' -o "$1" = 'uninstall' -o "$1" = 'restore' ]; then
        ACTION="$1"
    else
        errmsg "Error: [$1] cannnot be supported!"
        usage
        exit 1
    fi
fi
ENV='developing'    # by default
if [ $# -gt 0 ]; then
    if [ $(echo $ENV_TYPE |grep -wc $2) -ne 0 ]; then
        ENV="$2"
    else
        errmsg "Error: [$2] cannnot be supported!"
        usage
        exit 1
    fi
fi
QUIET='false'       # by default
if [ $# -lt 3 ]; then
    pask "Do you want to $ACTION the application [$UNAME]" || { echo -e '\nGoodbye.\n'; exit 1; }
elif [ "$3" = '-q' ]; then
    QUIET='true'
else
    errmsg "Error: [$2] cannot be supported!"
    usage
    exit 1
fi

# Create app user directory skeleton
#-------------------------------------------------------------
if [ "$ACTION" != 'uninstall' ]; then
    pdate
    echo 'Build app skeleton to app user home ...'
    create_app_skeleton $UNAME || { errmsg 'Error: build skeleton failed!'; exit 1; }
    echo OK.
fi

# Install, update, uninstall app 
#-------------------------------------------------------------
pdate
echo "$ACTION application ..."
if [ "$ACTION" = 'uninstall' ]; then
    uninstall_app $UNAME $ENV || { errmsg 'Error: uninstall failed!'; exit 1; }
else
    install_app $UNAME $SRC $ACTION  $ENV || { errmsg 'Error: install failed!'; exit 1; }
fi

# Output summary
#-------------------------------------------------------------
pdate
echo "$ACTION completed."
echo

if [ "$QUIET" = 'false' ]; then
    if pask 'Please check the install result'; then
        echo
        echo 'app user info:'; psep
        id $UNAME
        echo
        echo 'app home tree:'; psep
        tree -CF --dirsfirst "/home/$UNAME"
        echo
        echo 'app crontab:'; psep
        sudo -u $UNAME crontab -l
        echo
        echo 'app logrotate.d:'; psep
        ls -l /etc/logrotate.d/$UNAME
        echo
        is_httpd_app $UNAME && stat_httpd_app $UNAME
        echo
        is_pm2_app $UNAME && stat_pm2_app $UNAME
        echo
    fi
fi

#{+----------------------------------------- Embira Footer 1.7 -------+
# | vim<600:set et sw=4 ts=4 sts=4:                                   |
# | vim600:set et sw=4 ts=4 sts=4 ff=unix cindent fdm=indent fdn=1:   |
# +-------------------------------------------------------------------+}